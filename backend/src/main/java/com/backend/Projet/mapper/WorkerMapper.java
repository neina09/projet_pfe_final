package com.backend.Projet.mapper;

import com.backend.Projet.dto.WorkerResponseDto;
import com.backend.Projet.model.SubscriptionPaymentStatus;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerSubscription;
import com.backend.Projet.model.WorkerVerificationStatus;
import org.springframework.stereotype.Component;

@Component
public class WorkerMapper {

    public WorkerResponseDto toDto(Worker worker) {
        return toDto(worker, false);
    }

    public WorkerResponseDto toDto(Worker worker, boolean includeSensitiveDetails) {
        if (worker == null) {
            return null;
        }

        String resolvedImageUrl = worker.getImageUrl();
        // Unified image logic: prioritize User's image if linked, as it's the primary identity
        if (worker.getUser() != null && worker.getUser().getImageUrl() != null && !worker.getUser().getImageUrl().isBlank()) {
            resolvedImageUrl = worker.getUser().getImageUrl();
        } else if (resolvedImageUrl == null || resolvedImageUrl.isBlank()) {
            // Fallback to worker's own image if user's is missing (should not happen with sync)
            resolvedImageUrl = worker.getImageUrl();
        }

        String identityDocumentUrl = includeSensitiveDetails ? worker.getIdentityDocumentUrl() : null;
        String nationalIdNumber = includeSensitiveDetails ? worker.getNationalIdNumber() : null;
        String verificationNotes = includeSensitiveDetails ? worker.getVerificationNotes() : null;
        String userPhone = includeSensitiveDetails && worker.getUser() != null
                ? worker.getUser().getPhone()
                : null;
        WorkerSubscription subscription = worker.getSubscription();
        boolean subscriptionActive = subscription != null
                && subscription.isActive()
                && subscription.getEndsAt() != null
                && subscription.getEndsAt().isAfter(java.time.LocalDateTime.now());
        boolean subscriptionLegacyRecord = includeSensitiveDetails
                && subscription != null
                && subscriptionActive
                && subscription.getPaymentStatus() == SubscriptionPaymentStatus.AUTO_APPROVED
                && (isBlank(subscription.getTransferReference()) || isBlank(subscription.getReceiptUrl()));
        String subscriptionLegacyNote = subscriptionLegacyRecord
                ? "Legacy auto-approved subscription: proof fields were not stored in older records."
                : null;

        return WorkerResponseDto.builder()
                .id(worker.getId())
                .name(worker.getName())
                .job(worker.getJob())
                .address(worker.getAddress())
                .bio(worker.getBio())

                .imageUrl(resolvedImageUrl)
                .identityDocumentUrl(identityDocumentUrl)
                .nationalIdNumber(nationalIdNumber)
                .phoneNumber(worker.getPhoneNumber())
                .availability(worker.getAvailability())
                .averageRating(worker.getAverageRating())
                .verificationStatus(worker.getVerificationStatus())
                .verificationNotes(verificationNotes)
                .userId(worker.getUser() != null ? worker.getUser().getId() : null)
                .username(worker.getUser() != null ? worker.getUser().getUsername() : null)
                .userPhone(userPhone)
                .verified(worker.getVerificationStatus() == WorkerVerificationStatus.VERIFIED)
                .subscriptionRequired(worker.isSubscriptionRequired())
                .subscriptionActive(subscriptionActive)
                .subscriptionPaymentStatus(subscription != null ? subscription.getPaymentStatus() : null)
                .subscriptionEndsAt(subscription != null ? subscription.getEndsAt() : null)
                .subscriptionTransferReference(includeSensitiveDetails && subscription != null ? subscription.getTransferReference() : null)
                .subscriptionReceiptUrl(includeSensitiveDetails && subscription != null ? subscription.getReceiptUrl() : null)
                .subscriptionVerificationNotes(includeSensitiveDetails && subscription != null ? subscription.getVerificationNotes() : null)
                .subscriptionOcrRawText(null)
                .subscriptionVerifiedAt(includeSensitiveDetails && subscription != null ? subscription.getVerifiedAt() : null)
                .subscriptionLegacyRecord(subscriptionLegacyRecord)
                .subscriptionLegacyNote(subscriptionLegacyNote)
                .build();
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
