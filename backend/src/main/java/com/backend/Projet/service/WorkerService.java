package com.backend.Projet.service;

import com.backend.Projet.dto.WorkerRequestDto;
import com.backend.Projet.dto.WorkerResponseDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.WorkerVerificationStatus;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.OfferRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import com.backend.Projet.util.MauritaniaPhoneUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WorkerService {

    private final WorkerRepository workerRepository;
    private final RatingRepository ratingRepository;
    private final TaskRepository taskRepository;
    private final BookingRepository bookingRepository;
    private final OfferRepository offerRepository;
    private final UserRepository userRepository;
    private final com.backend.Projet.mapper.WorkerMapper workerMapper;
    private final FileStorageService fileStorageService;
    private final NotificationService notificationService;


    @Transactional
    public WorkerResponseDto registerAsWorker(WorkerRequestDto dto, User currentUser) {
        if (currentUser.getRole() == Role.ADMIN) {
            throw new BusinessException("Admin accounts cannot register themselves as workers");
        }
        if (workerRepository.findByUserId(currentUser.getId()).isPresent()) {
            throw new BusinessException("You are already registered as a worker");
        }
        String normalizedPhone = MauritaniaPhoneUtils.normalize(dto.getPhoneNumber());
        validateWorkerIdentity(dto.getNationalIdNumber(), normalizedPhone, null);

        Worker worker = Worker.builder()
                .name(dto.getName())
                .phoneNumber(normalizedPhone)
                .job(dto.getJob())
                .address(dto.getAddress())
                .bio(dto.getBio())
                .salary(dto.getSalary())
                .imageUrl(normalizeOptionalImageUrl(dto.getImageUrl()))
                .nationalIdNumber(dto.getNationalIdNumber().trim())
                .user(currentUser)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.PENDING)
                .verificationNotes("Pending admin review")
                .build();

        Worker savedWorker = workerRepository.save(worker);

        notificationService.sendNotificationToRole(
                Role.ADMIN,
                "New worker profile pending review: " + savedWorker.getName(),
                com.backend.Projet.model.NotificationType.ADMIN_WORKER_REVIEW
        );

        return workerMapper.toDto(savedWorker, false);
    }

    @Transactional
    public WorkerResponseDto createWorker(WorkerRequestDto dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new BusinessException("Admin accounts cannot be converted to workers");
        }
        if (workerRepository.findByUserId(userId).isPresent()) {
            throw new BusinessException("User is already registered as a worker");
        }
        String normalizedPhone = MauritaniaPhoneUtils.normalize(dto.getPhoneNumber());
        validateWorkerIdentity(dto.getNationalIdNumber(), normalizedPhone, null);

        user.setRole(Role.WORKER);
        userRepository.save(user);

        Worker worker = Worker.builder()
                .name(dto.getName())
                .phoneNumber(normalizedPhone)
                .job(dto.getJob())
                .address(dto.getAddress())
                .bio(dto.getBio())
                .salary(dto.getSalary())
                .imageUrl(normalizeOptionalImageUrl(dto.getImageUrl()))
                .nationalIdNumber(dto.getNationalIdNumber().trim())
                .user(user)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .verificationNotes("Verified by admin")
                .build();

        return workerMapper.toDto(workerRepository.save(worker), false);
    }

    public List<WorkerResponseDto> getAllWorkers() {
        return workerRepository.findByVerificationStatus(WorkerVerificationStatus.VERIFIED)
                .stream()
                .map(worker -> toDtoWithLiveAverage(worker, false))
                .toList();
    }

    public Page<WorkerResponseDto> getAllWorkersPaged(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return workerRepository.findByVerificationStatus(WorkerVerificationStatus.VERIFIED, pageable)
                .map(worker -> toDtoWithLiveAverage(worker, false));
    }

    public WorkerResponseDto getWorkerById(Long id) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        if (worker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new ResourceNotFoundException("Worker not found");
        }
        return toDtoWithLiveAverage(worker, false);
    }

    public WorkerResponseDto getWorkerForOwnerOrAdmin(Long id, User currentUser) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());
        if (!isAdmin && !isOwner) {
            throw new UnauthorizedException("Not authorized");
        }
        return toDtoWithLiveAverage(worker, isOwner || isAdmin);
    }

    public WorkerResponseDto getMyWorkerProfile(User currentUser) {
        Worker worker = workerRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Worker profile not found for this user"));
        return toDtoWithLiveAverage(worker, true);
    }

    @Transactional
    public WorkerResponseDto updateWorker(Long id, WorkerRequestDto dto, User currentUser) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new UnauthorizedException("You are not allowed to update this worker");
        }

        worker.setName(dto.getName());
        String normalizedPhone = MauritaniaPhoneUtils.normalize(dto.getPhoneNumber());
        validateWorkerIdentity(dto.getNationalIdNumber(), normalizedPhone, worker.getId());
        worker.setPhoneNumber(normalizedPhone);
        worker.setJob(dto.getJob());
        worker.setAddress(dto.getAddress());
        if (dto.getBio() != null) {
            worker.setBio(dto.getBio());
        }
        worker.setSalary(dto.getSalary());
        String imageUrl = normalizeOptionalImageUrl(dto.getImageUrl());
        if (imageUrl != null) {
            worker.setImageUrl(imageUrl);
        }
        if (isAdmin) {
            worker.setNationalIdNumber(dto.getNationalIdNumber().trim());
        }
        return toDtoWithLiveAverage(workerRepository.save(worker), isOwner || isAdmin);
    }

    @Transactional
    public WorkerResponseDto updateAvailability(Long id, WorkerAvailability availability, User currentUser) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());

        if (!isOwner) {
            throw new UnauthorizedException("You can only update your own availability");
        }
        if (worker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new BusinessException("Only verified workers can update availability");
        }

        worker.setAvailability(availability);
        return workerMapper.toDto(workerRepository.save(worker), true);
    }

    @Transactional
    public void deleteWorker(Long id, User currentUser) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));

        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());

        if (!isAdmin && !isOwner) {
            throw new UnauthorizedException("You are not allowed to delete this worker");
        }

        User workerUser = worker.getUser();
        workerUser.setRole(Role.USER);
        userRepository.save(workerUser);

        // Remove dependent records and detach task assignments before deleting the worker row.
        ratingRepository.deleteByTaskAssignedWorkerId(worker.getId());
        taskRepository.clearAssignedWorkerByWorkerId(worker.getId());
        ratingRepository.deleteByBookingWorkerId(worker.getId());
        ratingRepository.deleteByWorkerId(worker.getId());
        offerRepository.deleteByWorkerId(worker.getId());
        bookingRepository.deleteByWorkerId(worker.getId());

        fileStorageService.deleteStoredFile(worker.getImageUrl());
        fileStorageService.deleteStoredFile(worker.getIdentityDocumentUrl());

        workerRepository.delete(worker);
    }

    public List<WorkerResponseDto> getWorkersByAddress(String address) {
        return workerRepository.findByAddress(address)
                .stream()
                .filter(worker -> worker.getVerificationStatus() == WorkerVerificationStatus.VERIFIED)
                .map(worker -> workerMapper.toDto(worker, false))
                .toList();
    }

    public List<WorkerResponseDto> getWorkersByJob(String job) {
        return workerRepository.findByJob(job)
                .stream()
                .filter(worker -> worker.getVerificationStatus() == WorkerVerificationStatus.VERIFIED)
                .map(worker -> workerMapper.toDto(worker, false))
                .toList();
    }

    public List<WorkerResponseDto> getAvailableWorkers() {
        return workerRepository.findByAvailabilityAndVerificationStatus(
                        WorkerAvailability.AVAILABLE,
                        WorkerVerificationStatus.VERIFIED)
                .stream().map(worker -> workerMapper.toDto(worker, false)).toList();
    }

    public List<WorkerResponseDto> getWorkersPendingVerification() {
        return workerRepository.findByVerificationStatus(WorkerVerificationStatus.PENDING)
                .stream().map(worker -> toDtoWithLiveAverage(worker, true)).toList();
    }

    @Transactional(readOnly = true)
    public List<WorkerResponseDto> getAllWorkersForAdmin(User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can view all workers");
        }

        return workerRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .map(worker -> toDtoWithLiveAverage(worker, true))
                .toList();
    }

    public Resource getIdentityDocumentResource(Long id, User currentUser) {
        Worker worker = getOwnedOrManagedWorker(id, currentUser);
        if (worker.getIdentityDocumentUrl() == null || worker.getIdentityDocumentUrl().isBlank()) {
            throw new ResourceNotFoundException("Identity document not found");
        }
        return fileStorageService.loadAsResource(worker.getIdentityDocumentUrl());
    }

    public String getIdentityDocumentContentType(Long id, User currentUser) {
        Worker worker = getOwnedOrManagedWorker(id, currentUser);
        if (worker.getIdentityDocumentUrl() == null || worker.getIdentityDocumentUrl().isBlank()) {
            throw new ResourceNotFoundException("Identity document not found");
        }
        return fileStorageService.detectContentType(worker.getIdentityDocumentUrl());
    }

    @Transactional
    public WorkerResponseDto uploadWorkerImage(Long id, MultipartFile file, User currentUser) {
        Worker worker = getOwnedOrManagedWorker(id, currentUser);
        String previousImageUrl = worker.getImageUrl();
        worker.setImageUrl(fileStorageService.storeWorkerImage(file));
        Worker savedWorker = workerRepository.save(worker);
        if (previousImageUrl != null && !previousImageUrl.isBlank() && !previousImageUrl.equals(savedWorker.getImageUrl())) {
            fileStorageService.deleteStoredFile(previousImageUrl);
        }
        return workerMapper.toDto(savedWorker, true);
    }

    @Transactional
    public WorkerResponseDto uploadIdentityDocument(Long id, MultipartFile file, User currentUser) {
        Worker worker = getOwnedOrManagedWorker(id, currentUser);
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean alreadyHasIdentityDocument = worker.getIdentityDocumentUrl() != null && !worker.getIdentityDocumentUrl().isBlank();

        if (!isAdmin && alreadyHasIdentityDocument) {
            throw new BusinessException("Identity document can only be submitted during worker registration");
        }

        String previousDocumentUrl = worker.getIdentityDocumentUrl();
        worker.setIdentityDocumentUrl(fileStorageService.storeWorkerDocument(file));
        
        if (isAdmin) {
            worker.setVerificationStatus(WorkerVerificationStatus.VERIFIED);
            worker.setVerificationNotes("Identity document uploaded by admin");
        } else {
            worker.setVerificationStatus(WorkerVerificationStatus.PENDING);
            worker.setVerificationNotes("Identity document uploaded and waiting for admin review");
        }
        
        Worker savedWorker = workerRepository.save(worker);
        if (previousDocumentUrl != null && !previousDocumentUrl.isBlank() && !previousDocumentUrl.equals(savedWorker.getIdentityDocumentUrl())) {
            fileStorageService.deleteStoredFile(previousDocumentUrl);
        }

        notificationService.sendNotificationToRole(
                Role.ADMIN,
                "Worker submitted identity document for review: " + savedWorker.getName(),
                com.backend.Projet.model.NotificationType.ADMIN_WORKER_REVIEW
        );

        return workerMapper.toDto(savedWorker, true);
    }

    @Transactional
    public WorkerResponseDto verifyWorker(Long id, User currentUser, String notes) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can verify workers");
        }
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        if (worker.getImageUrl() == null || worker.getImageUrl().isBlank()) {
            throw new BusinessException("Worker profile photo is required before verification");
        }
        if (worker.getIdentityDocumentUrl() == null || worker.getIdentityDocumentUrl().isBlank()) {
            throw new BusinessException("Identity document is required before verification");
        }
        worker.setVerificationStatus(WorkerVerificationStatus.VERIFIED);
        worker.setVerificationNotes(notes == null || notes.isBlank() ? "Verified by admin" : notes.trim());
        worker.setAvailability(WorkerAvailability.AVAILABLE);
        User workerUser = worker.getUser();
        workerUser.setRole(Role.WORKER);
        userRepository.save(workerUser);
        Worker savedWorker = workerRepository.save(worker);

        notificationService.sendNotification(
                workerUser,
                "Your worker account has been verified.",
                com.backend.Projet.model.NotificationType.WORKER_VERIFIED
        );

        return workerMapper.toDto(savedWorker, true);
    }

    @Transactional
    public WorkerResponseDto rejectWorker(Long id, User currentUser, String notes) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can reject workers");
        }
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        worker.setVerificationStatus(WorkerVerificationStatus.REJECTED);
        worker.setVerificationNotes(notes == null || notes.isBlank() ? "Rejected by admin" : notes.trim());
        User workerUser = worker.getUser();
        workerUser.setRole(Role.USER);
        userRepository.save(workerUser);
        Worker savedWorker = workerRepository.save(worker);

        notificationService.sendNotification(
                workerUser,
                "Your worker verification was rejected. Please review your documents and try again.",
                com.backend.Projet.model.NotificationType.WORKER_REJECTED
        );

        return workerMapper.toDto(savedWorker, true);
    }

    private void validateWorkerIdentity(String nationalIdNumber, String phoneNumber, Long currentWorkerId) {
        workerRepository.findByPhoneNumber(phoneNumber)
                .filter(worker -> currentWorkerId == null || !worker.getId().equals(currentWorkerId))
                .ifPresent(worker -> {
                    throw new BusinessException("Phone number is already used by another worker");
                });

        workerRepository.findByNationalIdNumber(nationalIdNumber.trim())
                .filter(worker -> currentWorkerId == null || !worker.getId().equals(currentWorkerId))
                .ifPresent(worker -> {
                    throw new BusinessException("National ID number is already used by another worker");
                });
    }

    private String normalizeOptionalImageUrl(String imageUrl) {
        if (imageUrl == null) {
            return null;
        }

        String trimmed = imageUrl.trim();
        if (trimmed.isEmpty()) {
            return null;
        }

        if (trimmed.startsWith("data:")) {
            throw new BusinessException("Profile photo must be uploaded as a file");
        }

        return trimmed;
    }

    private Worker getOwnedOrManagedWorker(Long id, User currentUser) {
        Worker worker = workerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;
        boolean isOwner = worker.getUser().getId().equals(currentUser.getId());
        if (!isAdmin && !isOwner) {
            throw new UnauthorizedException("Not authorized");
        }
        return worker;
    }

    private WorkerResponseDto toDtoWithLiveAverage(Worker worker, boolean includeSensitiveDetails) {
        Double avg = ratingRepository.calculateAverageRating(worker.getId());
        worker.setAverageRating(avg != null ? avg : 0.0);
        return workerMapper.toDto(worker, includeSensitiveDetails);
    }
}
