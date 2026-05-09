package com.backend.Projet.service;

import com.backend.Projet.dto.*;
import com.backend.Projet.exception.*;
import com.backend.Projet.model.*;
import com.backend.Projet.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository      taskRepository;
    private final OfferRepository     offerRepository;
    private final RatingRepository    ratingRepository;
    private final WorkerRepository    workerRepository;
    private final UserRepository      userRepository;
    private final NotificationService notificationService;
    private final com.backend.Projet.mapper.TaskMapper taskMapper;
    private final com.backend.Projet.mapper.OfferMapper offerMapper;

    @Transactional
    public TaskResponseDto createTask(TaskRequestDto input, User user) {
        User managedUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Task task = Task.builder()
                .title(input.getTitle())
                .description(input.getDescription())
                .address(input.getAddress())
                .profession(input.getProfession())
                .latitude(input.getLatitude())
                .longitude(input.getLongitude())
                .status(user.getRole() == Role.ADMIN ? TaskStatus.OPEN : TaskStatus.PENDING_REVIEW)
                .user(managedUser)
                .build();

        Task savedTask = taskRepository.save(task);

        if (savedTask.getStatus() == TaskStatus.PENDING_REVIEW) {
            notificationService.sendNotificationToRole(
                    Role.ADMIN,
                    "New task pending review: " + savedTask.getTitle(),
                    NotificationType.ADMIN_TASK_REVIEW
            );
        }

        return toTaskDto(savedTask);
    }

    // مرئية للجميع بدون login
    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getOpenTasks(Pageable pageable) {
        return getOpenTasks(pageable, null, null);
    }

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getOpenTasks(
            Pageable pageable, Double userLatitude, Double userLongitude) {
        return PageResponseDto.from(
                taskRepository.findByStatus(TaskStatus.OPEN, pageable)
                        .map(task -> toTaskDto(task, userLatitude, userLongitude))
        );
    }

    // بحث في Tasks المفتوحة
    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> searchOpenTasks(
            String keyword, String address, String profession, Pageable pageable) {
        return searchOpenTasks(keyword, address, profession, pageable, null, null);
    }

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> searchOpenTasks(
            String keyword, String address, String profession, Pageable pageable,
            Double userLatitude, Double userLongitude) {
        return PageResponseDto.from(
                taskRepository.searchOpenTasks(
                                TaskStatus.OPEN, address, profession, keyword, pageable)
                        .map(task -> toTaskDto(task, userLatitude, userLongitude))
        );
    }

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getMyTasks(
            User user, TaskStatus status, Pageable pageable) {
        Page<Task> page = (status == null)
                ? taskRepository.findByUserId(user.getId(), pageable)
                : taskRepository.findByUserIdAndStatus(user.getId(), status, pageable);
        return PageResponseDto.from(page.map(taskMapper::toDto));
    }

    @Transactional(readOnly = true)
    public List<TaskResponseDto> getTasksAssignedToMe(User workerUser) {
        Worker worker = workerRepository.findByUserId(workerUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Worker profile not found"));
        return taskRepository.findByAssignedWorkerId(worker.getId())
                .stream().map(taskMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getPendingTasks(Pageable pageable) {
        return PageResponseDto.from(
                taskRepository.findByStatus(TaskStatus.PENDING_REVIEW, pageable)
                        .map(taskMapper::toDto)
        );
    }

    @Transactional(readOnly = true)
    public PageResponseDto<TaskResponseDto> getTasksByStatus(TaskStatus status, Pageable pageable) {
        Page<Task> tasks;
        if (status == null) {
            tasks = taskRepository.findAll(pageable);
        } else {
            tasks = taskRepository.findByStatus(status, pageable);
        }
        return PageResponseDto.from(tasks.map(taskMapper::toDto));
    }

    // الجميع يرون تفاصيل أي Task عبر ID بغض النظر عن الحالة
    @Transactional(readOnly = true)
    public TaskResponseDto getTaskById(Long id) {
        return getTaskById(id, null, null);
    }

    @Transactional(readOnly = true)
    public TaskResponseDto getTaskById(Long id, Double userLatitude, Double userLongitude) {
        return getTaskById(id, userLatitude, userLongitude, null);
    }

    @Transactional(readOnly = true)
    public TaskResponseDto getTaskById(Long id, Double userLatitude, Double userLongitude, User currentUser) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        boolean isPublicOpenTask = task.getStatus() == TaskStatus.OPEN;
        boolean isOwner = currentUser != null && task.getUser() != null && task.getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser != null && currentUser.getRole() == Role.ADMIN;
        boolean isAssignedWorker = currentUser != null
                && task.getAssignedWorker() != null
                && task.getAssignedWorker().getUser() != null
                && task.getAssignedWorker().getUser().getId().equals(currentUser.getId());

        if (!isPublicOpenTask && !isOwner && !isAdmin && !isAssignedWorker) {
            throw new ResourceNotFoundException("Task not found");
        }
        return toTaskDto(task, userLatitude, userLongitude);
    }

    @Transactional
    public TaskResponseDto updateTask(
            Long id, TaskRequestDto input, User user) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId()))
            throw new UnauthorizedException("Not authorized");
        if (task.getStatus() == TaskStatus.CLOSED
                || task.getStatus() == TaskStatus.CANCELLED)
            throw new BusinessException("Cannot update a closed or cancelled task");

        task.setTitle(input.getTitle());
        task.setDescription(input.getDescription());
        task.setAddress(input.getAddress());
        task.setProfession(input.getProfession());
        task.setLatitude(input.getLatitude());
        task.setLongitude(input.getLongitude());
        if (task.getStatus() == TaskStatus.OPEN) {
            task.setStatus(TaskStatus.PENDING_REVIEW);
        }
        return toTaskDto(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(Long id, User user) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        boolean isOwner = task.getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;

        if (!isOwner && !isAdmin)
            throw new UnauthorizedException("Not authorized");

        if (task.getStatus() == TaskStatus.IN_PROGRESS && !isAdmin)
            throw new BusinessException("Cannot delete a task in progress");

        ratingRepository.deleteByTaskId(id);
        offerRepository.deleteByTaskId(id);
        taskRepository.delete(task);
    }

    @Transactional
    public void deleteOffer(Long offerId, User user) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        boolean isOwner = offer.getWorker().getUser().getId().equals(user.getId());
        boolean isAdmin = user.getRole() == Role.ADMIN;
        boolean isTaskOwner = offer.getTask().getUser().getId().equals(user.getId());

        if (!isOwner && !isAdmin && !isTaskOwner)
            throw new UnauthorizedException("Not authorized");

        offerRepository.delete(offer);
    }

    // المستخدم يرى العروض على task معينة
    @Transactional(readOnly = true)
    public List<OfferResponseDto> getOffersForTask(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId()))
            throw new UnauthorizedException("Not your task");
        return offerRepository.findByTaskId(taskId)
                .stream().map(offerMapper::toDto).toList();
    }

    // المستخدم يختار عرض → SELECTED
    @Transactional
    public OfferResponseDto selectOffer(Long offerId, User user) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));
        Task task = offer.getTask();

        if (!task.getUser().getId().equals(user.getId()))
            throw new UnauthorizedException("Not your task");
        if (task.getStatus() != TaskStatus.OPEN)
            throw new BusinessException("Task is not open");
        if (offer.getStatus() != OfferStatus.PENDING)
            throw new BusinessException("Offer is not pending");
        if (offer.getWorker().getAvailability() != null
                && offer.getWorker().getAvailability() != WorkerAvailability.AVAILABLE)
            throw new BusinessException("Worker is currently busy and cannot be selected");

        offerRepository.findByTaskId(task.getId()).stream()
                .filter(existingOffer -> !existingOffer.getId().equals(offerId))
                .filter(existingOffer -> existingOffer.getStatus() == OfferStatus.PENDING
                        || existingOffer.getStatus() == OfferStatus.SELECTED)
                .forEach(existingOffer -> {
                    existingOffer.setStatus(OfferStatus.CLOSED);
                    offerRepository.save(existingOffer);
                });

        offer.setStatus(OfferStatus.SELECTED);
        Offer savedOffer = offerRepository.save(offer);

        notificationService.sendNotification(
                offer.getWorker().getUser(),
                "You have been selected for the task: " + task.getTitle(),
                NotificationType.TASK_SELECTED
        );

        return offerMapper.toDto(savedOffer);
    }

    // المستخدم يؤكد الإنجاز → COMPLETED
    @Transactional
    public TaskResponseDto markDone(Long taskId, User user) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId()))
            throw new UnauthorizedException("Not your task");
        if (task.getStatus() != TaskStatus.IN_PROGRESS)
            throw new BusinessException("Task is not in progress");

        offerRepository.findByTaskId(taskId).stream()
                .filter(o -> o.getStatus() == OfferStatus.IN_PROGRESS)
                .findFirst()
                .ifPresent(o -> {
                    o.setStatus(OfferStatus.COMPLETED);
                    offerRepository.save(o);
                });

        task.setStatus(TaskStatus.COMPLETED);
        return toTaskDto(taskRepository.save(task));
    }

    // المستخدم يلغي Task
    @Transactional
    public TaskResponseDto cancelTask(Long id, User user) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        if (!task.getUser().getId().equals(user.getId()))
            throw new UnauthorizedException("Not authorized");
        if (task.getStatus() == TaskStatus.CLOSED
                || task.getStatus() == TaskStatus.CANCELLED)
            throw new BusinessException("Task is already closed or cancelled");
        if (task.getStatus() == TaskStatus.PENDING_REVIEW) {
            task.setStatus(TaskStatus.CANCELLED);
            return toTaskDto(taskRepository.save(task));
        }
        if (task.getStatus() == TaskStatus.IN_PROGRESS)
            throw new BusinessException("Cannot cancel a task in progress");

        offerRepository.findByTaskId(id).stream()
                .filter(o -> o.getStatus() == OfferStatus.PENDING
                        || o.getStatus() == OfferStatus.SELECTED)
                .forEach(o -> {
                    o.setStatus(OfferStatus.CLOSED);
                    offerRepository.save(o);
                });

        task.setStatus(TaskStatus.CANCELLED);
        return toTaskDto(taskRepository.save(task));
    }

    @Transactional
    public TaskResponseDto approveTask(Long taskId, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can approve tasks");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.PENDING_REVIEW) {
            throw new BusinessException("Task is not pending review");
        }

        task.setStatus(TaskStatus.OPEN);
        Task savedTask = taskRepository.save(task);

        notificationService.sendNotification(
                task.getUser(),
                "Your task has been approved and is now visible on the platform: " + task.getTitle(),
                NotificationType.TASK_ACCEPTED
        );

        return toTaskDto(savedTask);
    }

    @Transactional
    public TaskResponseDto rejectTask(Long taskId, User currentUser) {
        if (currentUser.getRole() != Role.ADMIN) {
            throw new UnauthorizedException("Only admins can reject tasks");
        }

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.PENDING_REVIEW) {
            throw new BusinessException("Task is not pending review");
        }

        task.setStatus(TaskStatus.CANCELLED);
        Task savedTask = taskRepository.save(task);

        notificationService.sendNotification(
                task.getUser(),
                "Your task was rejected by the admin. Please update it and submit it again.",
                NotificationType.TASK_REFUSED
        );

        return toTaskDto(savedTask);
    }

    @Transactional
    public OfferResponseDto submitOffer(
            Long taskId, OfferRequestDto dto, User workerUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.OPEN)
            throw new BusinessException("Task is not open");
        if (task.getUser().getId().equals(workerUser.getId()))
            throw new BusinessException("Cannot offer on your own task");

        if (workerUser.getRole() != Role.WORKER)
            throw new BusinessException("Only workers can submit offers");

        Worker worker = workerRepository.findByUserId(workerUser.getId())
                .orElseThrow(() -> new BusinessException(
                        "Please complete your worker profile before submitting offers"));
        if (worker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new BusinessException("Only verified workers can submit offers");
        }
        if (worker.getAvailability() != null
                && worker.getAvailability() != WorkerAvailability.AVAILABLE) {
            throw new BusinessException("You must be AVAILABLE to submit an offer. Please update your status in profile settings.");
        }

        if (offerRepository.existsByTaskIdAndWorkerId(taskId, worker.getId()))
            throw new BusinessException("You already submitted an offer on this task");

        Offer offer = Offer.builder()
                .task(task)
                .worker(worker)
                .message(dto.getMessage())
                .build();

        Offer savedOffer = offerRepository.save(offer);

        notificationService.sendNotification(
                task.getUser(),
                "You have a new offer on your task: " + task.getTitle(),
                NotificationType.TASK_OFFER
        );

        return offerMapper.toDto(savedOffer);
    }

    @Transactional(readOnly = true)
    public List<OfferResponseDto> getMyOffers(User workerUser) {
        return offerRepository.findByWorkerUserId(workerUser.getId())
                .stream().map(offerMapper::toDto).toList();
    }

    @Transactional
    public OfferResponseDto workerAccept(Long offerId, User workerUser) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getWorker().getUser().getId().equals(workerUser.getId()))
            throw new UnauthorizedException("Not your offer");
        if (offer.getStatus() != OfferStatus.SELECTED)
            throw new BusinessException("You were not selected yet");

        Task task = offer.getTask();
        if (task.getStatus() != TaskStatus.OPEN) {
            throw new BusinessException("Task is no longer available");
        }
        if (task.getAssignedWorker() != null) {
            throw new BusinessException("Task already has an assigned worker");
        }

        offer.setStatus(OfferStatus.IN_PROGRESS);
        offerRepository.save(offer);

        task.setStatus(TaskStatus.IN_PROGRESS);
        task.setAssignedWorker(offer.getWorker());
        taskRepository.save(task);

        notificationService.sendNotification(
                task.getUser(),
                "Worker " + offer.getWorker().getName() + " has accepted to start working on: " + task.getTitle(),
                NotificationType.TASK_ACCEPTED
        );

        return offerMapper.toDto(offer);
    }

    @Transactional
    public OfferResponseDto workerRefuse(Long offerId, User workerUser) {
        Offer offer = offerRepository.findById(offerId)
                .orElseThrow(() -> new ResourceNotFoundException("Offer not found"));

        if (!offer.getWorker().getUser().getId().equals(workerUser.getId()))
            throw new UnauthorizedException("Not your offer");
        if (offer.getStatus() != OfferStatus.SELECTED)
            throw new BusinessException("You were not selected yet");

        offer.setStatus(OfferStatus.WORKER_REFUSED);
        offerRepository.save(offer);

        Task task = offer.getTask();
        task.setStatus(TaskStatus.OPEN);
        task.setAssignedWorker(null);
        taskRepository.save(task);

        offerRepository.findByTaskId(task.getId()).stream()
                .filter(o -> o.getStatus() == OfferStatus.CLOSED
                        && !o.getId().equals(offerId))
                .forEach(o -> {
                    o.setStatus(OfferStatus.PENDING);
                    offerRepository.save(o);
                });

        notificationService.sendNotification(
                task.getUser(),
                "Worker " + offer.getWorker().getName() + " has refused the task: " + task.getTitle(),
                NotificationType.TASK_REFUSED
        );

        return offerMapper.toDto(offer);
    }

    @Transactional
    public void requestAnotherWorker(Long taskId, WorkerReferralRequestDto dto, User workerUser) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.OPEN && task.getStatus() != TaskStatus.IN_PROGRESS) {
            throw new BusinessException("Task is not available for worker referrals");
        }
        if (task.getUser().getId().equals(workerUser.getId())) {
            throw new BusinessException("Cannot request another worker on your own task");
        }
        if (workerUser.getRole() != Role.WORKER) {
            throw new BusinessException("Only workers can request another worker");
        }

        Worker requestingWorker = workerRepository.findByUserId(workerUser.getId())
                .orElseThrow(() -> new BusinessException("Please complete your worker profile first"));
        if (requestingWorker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new BusinessException("Only verified workers can request another worker");
        }

        Worker requestedWorker = workerRepository.findById(dto.getWorkerId())
                .orElseThrow(() -> new ResourceNotFoundException("Requested worker not found"));

        if (requestedWorker.getId().equals(requestingWorker.getId())) {
            throw new BusinessException("You cannot request yourself");
        }
        if (requestedWorker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new BusinessException("Requested worker must be verified");
        }
        if (requestedWorker.getAvailability() != null
                && requestedWorker.getAvailability() != WorkerAvailability.AVAILABLE) {
            throw new BusinessException("Requested worker is not currently available");
        }
        if (offerRepository.existsByTaskIdAndWorkerId(taskId, requestedWorker.getId())) {
            throw new BusinessException("This worker already has an offer on the task");
        }

        String referralMessage = dto.getMessage().trim();
        notificationService.sendNotification(
                requestedWorker.getUser(),
                "Worker " + requestingWorker.getName() + " asked you to review task: "
                        + task.getTitle() + ". Message: " + referralMessage,
                NotificationType.WORKER_ASSISTANCE_REQUEST
        );
        notificationService.sendNotification(
                task.getUser(),
                "Worker " + requestingWorker.getName() + " requested help from "
                        + requestedWorker.getName() + " on task: " + task.getTitle(),
                NotificationType.WORKER_ASSISTANCE_REQUEST
        );
    }

    private TaskResponseDto toTaskDto(Task task) {
        Task hydratedTask = taskRepository.findById(task.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        return toTaskDto(hydratedTask, null, null);
    }

    private TaskResponseDto toTaskDto(Task task, Double userLatitude, Double userLongitude) {
        TaskResponseDto dto = taskMapper.toDto(task);
        dto.setDistanceKm(calculateDistanceKm(
                userLatitude, userLongitude, task.getLatitude(), task.getLongitude()));
        return dto;
    }

    private Double calculateDistanceKm(
            Double userLatitude, Double userLongitude,
            Double taskLatitude, Double taskLongitude) {
        if (userLatitude == null || userLongitude == null
                || taskLatitude == null || taskLongitude == null) {
            return null;
        }

        double earthRadiusKm = 6371.0;
        double latDistance = Math.toRadians(taskLatitude - userLatitude);
        double lonDistance = Math.toRadians(taskLongitude - userLongitude);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(userLatitude))
                * Math.cos(Math.toRadians(taskLatitude))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distanceKm = earthRadiusKm * c;

        return BigDecimal.valueOf(distanceKm)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
