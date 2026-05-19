package com.backend.Projet.service;

import com.backend.Projet.dto.WorkerSubscriptionResponseDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.model.*;
import com.backend.Projet.repository.WorkerRepository;
import com.backend.Projet.repository.WorkerSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class WorkerSubscriptionService {

    private final WorkerRepository workerRepository;
    private final WorkerSubscriptionRepository workerSubscriptionRepository;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;
    private final ReceiptOcrService receiptOcrService;

    @Value("${app.worker-subscription.amount:200}")
    private BigDecimal subscriptionAmount;

    @Value("${app.worker-subscription.duration-months:6}")
    private Integer subscriptionDurationMonths;

    @Value("${app.worker-subscription.recipient-name:neina med vall}")
    private String recipientName;

    @Value("${app.worker-subscription.account-number:48995086}")
    private String accountNumber;

    @Value("${app.worker-subscription.bank-name:Bank Account}")
    private String bankName;

    @Value("${app.worker-subscription.qr-image-url:/payment-qr.svg}")
    private String qrImageUrl;

    @Transactional(readOnly = true)
    public WorkerSubscriptionResponseDto getMySubscription(User currentUser) {
        Worker worker = workerRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Worker profile not found for this user"));
        refreshSubscriptionState(worker);
        WorkerSubscription subscription = getOrCreateSubscription(worker);
        return toDto(subscription);
    }

    @Transactional
    public WorkerSubscriptionResponseDto submitReceipt(Long workerId, MultipartFile file, String transferReference, User currentUser) {
        Worker worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        if (!isOwner && !isAdmin) {
            throw new UnauthorizedException("Not authorized");
        }

        String normalizedReference = normalizeReference(transferReference);
        WorkerSubscription subscription = getOrCreateSubscription(worker);
        if (workerSubscriptionRepository.existsByTransferReference(normalizedReference)
                && (subscription.getTransferReference() == null || !normalizedReference.equals(subscription.getTransferReference()))) {
            throw new BusinessException("Transfer reference is already used");
        }

        String previousReceiptUrl = subscription.getReceiptUrl();
        String storedReceipt = fileStorageService.storePaymentReceipt(file);

        subscription.setAmount(subscriptionAmount);
        subscription.setDurationMonths(subscriptionDurationMonths);
        subscription.setPaymentMethod(SubscriptionPaymentMethod.BANK_QR);
        subscription.setTransferReference(normalizedReference);
        subscription.setReceiptUrl(storedReceipt);

        ReceiptOcrAnalysis ocrAnalysis = receiptOcrService.analyzeReceipt(storedReceipt, normalizedReference, subscriptionAmount);
        applyReceiptVerificationOutcome(subscription, ocrAnalysis);

        WorkerSubscription savedSubscription = workerSubscriptionRepository.save(subscription);

        notificationService.sendNotificationToRole(
                Role.ADMIN,
                "Worker subscription payment submitted for review: " + worker.getName(),
                NotificationType.ADMIN_WORKER_REVIEW
        );

        if (previousReceiptUrl != null && !previousReceiptUrl.isBlank() && !previousReceiptUrl.equals(storedReceipt)) {
            fileStorageService.deleteStoredFile(previousReceiptUrl);
        }

        return toDto(savedSubscription);
    }

    @Transactional
    public void deleteSubscriptionArtifacts(Worker worker) {
        workerSubscriptionRepository.findByWorkerId(worker.getId()).ifPresent(subscription -> {
            fileStorageService.deleteStoredFile(subscription.getReceiptUrl());
            workerSubscriptionRepository.delete(subscription);
        });
    }

    @Transactional(readOnly = true)
    public boolean isSubscriptionActive(Worker worker) {
        return worker != null && isSubscriptionActive(worker.getSubscription());
    }

    @Transactional(readOnly = true)
    public boolean isSubscriptionActive(WorkerSubscription subscription) {
        if (subscription == null) {
            return false;
        }
        SubscriptionPaymentStatus status = subscription.getPaymentStatus();
        // Both APPROVED (admin manual) and AUTO_APPROVED (OCR) can be active
        boolean isApprovedStatus = status == SubscriptionPaymentStatus.APPROVED
                || status == SubscriptionPaymentStatus.AUTO_APPROVED;
        if (!isApprovedStatus) {
            return false;
        }
        if (!subscription.isActive()) {
            return false;
        }
        if (subscription.getEndsAt() == null) {
            return false;
        }
        return subscription.getEndsAt().isAfter(LocalDateTime.now());
    }

    @Transactional
    public void refreshSubscriptionState(Worker worker) {
        if (worker == null || worker.getSubscription() == null) {
            return;
        }

        WorkerSubscription subscription = worker.getSubscription();
        if (shouldReprocessPendingReceiptWithOcr(subscription)) {
            ReceiptOcrAnalysis ocrAnalysis = receiptOcrService.analyzeReceipt(
                    subscription.getReceiptUrl(),
                    subscription.getTransferReference(),
                    subscription.getAmount() != null ? subscription.getAmount() : subscriptionAmount
            );
            applyReceiptVerificationOutcome(subscription, ocrAnalysis);
            workerSubscriptionRepository.save(subscription);
            return;
        }
        if (subscription.isActive() && subscription.getEndsAt() != null && subscription.getEndsAt().isBefore(LocalDateTime.now())) {
            subscription.setActive(false);
            subscription.setPaymentStatus(SubscriptionPaymentStatus.EXPIRED);
            subscription.setVerificationNotes("Subscription expired");
            workerSubscriptionRepository.save(subscription);
        }
    }

    @Transactional
    public WorkerSubscriptionResponseDto approveSubscriptionPayment(Long workerId, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can approve worker subscription payments");
        }
        Worker worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        WorkerSubscription subscription = workerSubscriptionRepository.findByWorkerId(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker subscription not found"));
        if (subscription.getReceiptUrl() == null || subscription.getReceiptUrl().isBlank()) {
            throw new BusinessException("Payment receipt is required before approval");
        }
        if (subscription.getTransferReference() == null || subscription.getTransferReference().isBlank()) {
            throw new BusinessException("Transfer reference is required before approval");
        }

        applyManualApproval(subscription);
        WorkerSubscription savedSubscription = workerSubscriptionRepository.save(subscription);

        notificationService.sendNotification(
                worker.getUser(),
                "Your subscription payment has been verified by the admin.",
                NotificationType.WORKER_VERIFIED
        );

        return toDto(savedSubscription);
    }

    @Transactional
    public WorkerSubscriptionResponseDto rejectSubscriptionPayment(Long workerId, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can reject worker subscription payments");
        }
        Worker worker = workerRepository.findById(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        WorkerSubscription subscription = workerSubscriptionRepository.findByWorkerId(workerId)
                .orElseThrow(() -> new ResourceNotFoundException("Worker subscription not found"));

        subscription.setPaymentStatus(SubscriptionPaymentStatus.REJECTED);
        subscription.setActive(false);
        subscription.setStartsAt(null);
        subscription.setEndsAt(null);
        subscription.setVerifiedAt(null);
        subscription.setVerificationNotes("Payment receipt was rejected by the admin.");

        WorkerSubscription savedSubscription = workerSubscriptionRepository.save(subscription);

        notificationService.sendNotification(
                worker.getUser(),
                "Your subscription payment was rejected. Please upload a valid receipt and reference.",
                NotificationType.WORKER_REJECTED
        );

        return toDto(savedSubscription);
    }

    private void applyManualApproval(WorkerSubscription subscription) {
        LocalDateTime now = LocalDateTime.now();
        // Use APPROVED (not AUTO_APPROVED) to mark admin-confirmed payments
        // AUTO_APPROVED is reserved for OCR-verified receipts
        subscription.setPaymentStatus(SubscriptionPaymentStatus.APPROVED);
        subscription.setVerifiedAt(now);
        subscription.setStartsAt(now);
        subscription.setEndsAt(now.plusMonths(subscriptionDurationMonths));
        subscription.setActive(true);
        subscription.setVerificationNotes("تم التحقق من الدفع بواسطة الإدارة.");
    }

    private void markPendingReview(WorkerSubscription subscription) {
        subscription.setPaymentStatus(SubscriptionPaymentStatus.PENDING);
        subscription.setVerifiedAt(null);
        subscription.setStartsAt(null);
        subscription.setEndsAt(null);
        subscription.setActive(false);
    }

    private boolean shouldReprocessPendingReceiptWithOcr(WorkerSubscription subscription) {
        if (subscription == null || subscription.getPaymentStatus() != SubscriptionPaymentStatus.PENDING) {
            return false;
        }
        if (subscription.getReceiptUrl() == null || subscription.getReceiptUrl().isBlank()) {
            return false;
        }
        if (subscription.getTransferReference() == null || subscription.getTransferReference().isBlank()) {
            return false;
        }
        String notes = subscription.getVerificationNotes();
        if (notes == null || notes.isBlank()) {
            return true;
        }
        String normalizedNotes = notes.toLowerCase(java.util.Locale.ROOT);
        return normalizedNotes.contains("ocr")
                || normalizedNotes.contains("automatic activation is disabled")
                || normalizedNotes.contains("manual admin review");
    }

    private void applyReceiptVerificationOutcome(WorkerSubscription subscription, ReceiptOcrAnalysis ocrAnalysis) {
        if (ocrAnalysis.isVerified()) {
            // OCR successfully verified the receipt — activate automatically
            LocalDateTime now = LocalDateTime.now();
            subscription.setPaymentStatus(SubscriptionPaymentStatus.AUTO_APPROVED);
            subscription.setVerifiedAt(now);
            subscription.setStartsAt(now);
            subscription.setEndsAt(now.plusMonths(subscriptionDurationMonths));
            subscription.setActive(true);
            subscription.setVerificationNotes(ocrAnalysis.getSummary());
        } else {
            // OCR could not verify — put in pending for manual admin review
            markPendingReview(subscription);
            subscription.setVerificationNotes(ocrAnalysis.getSummary());
        }
    }

    private WorkerSubscription getOrCreateSubscription(Worker worker) {
        WorkerSubscription subscription = workerSubscriptionRepository.findByWorkerId(worker.getId())
                .orElseGet(() -> WorkerSubscription.builder()
                        .worker(worker)
                        .amount(subscriptionAmount)
                        .durationMonths(subscriptionDurationMonths)
                        .paymentMethod(SubscriptionPaymentMethod.BANK_QR)
                        .paymentStatus(SubscriptionPaymentStatus.NOT_SUBMITTED)
                        .active(false)
                        .build());
        worker.setSubscription(subscription);
        return subscription;
    }

    private WorkerSubscriptionResponseDto toDto(WorkerSubscription subscription) {
        return WorkerSubscriptionResponseDto.builder()
                .workerId(subscription.getWorker() != null ? subscription.getWorker().getId() : null)
                .amount(subscriptionAmount)
                .durationMonths(subscriptionDurationMonths)
                .recipientName(recipientName)
                .accountNumber(accountNumber)
                .bankName(bankName)
                .qrImageUrl(qrImageUrl)
                .paymentMethod(subscription.getPaymentMethod())
                .paymentStatus(subscription.getPaymentStatus())
                .transferReference(subscription.getTransferReference())
                .receiptUrl(subscription.getReceiptUrl())
                .verificationNotes(subscription.getVerificationNotes())
                .active(isSubscriptionActive(subscription))
                .startsAt(subscription.getStartsAt())
                .endsAt(subscription.getEndsAt())
                .verifiedAt(subscription.getVerifiedAt())
                .build();
    }

    private String normalizeReference(String transferReference) {
        if (transferReference == null || transferReference.isBlank()) {
            throw new BusinessException("Transfer reference is required");
        }
        String normalized = transferReference.trim();
        if (normalized.length() < 4) {
            throw new BusinessException("Transfer reference is too short");
        }
        return normalized;
    }
}
