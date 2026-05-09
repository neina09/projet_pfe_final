package com.backend.Projet.service;

import com.backend.Projet.dto.AdminDashboardDto;
import com.backend.Projet.mapper.TaskMapper;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.NotificationRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import com.backend.Projet.model.BookingStatus;
import com.backend.Projet.model.TaskStatus;
import com.backend.Projet.model.User;
import com.backend.Projet.model.WorkerVerificationStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;
    private final TaskRepository taskRepository;
    private final BookingRepository bookingRepository;
    private final NotificationRepository notificationRepository;
    private final com.backend.Projet.mapper.WorkerMapper workerMapper;
    private final TaskMapper taskMapper;

    public AdminDashboardDto getDashboard(User currentUser) {
        return AdminDashboardDto.builder()
                .totalUsers(userRepository.count())
                .verifiedUsers(userRepository.countByEnabledTrue())
                .totalWorkers(workerRepository.countByVerificationStatus(WorkerVerificationStatus.VERIFIED))
                .verifiedWorkers(workerRepository.countByVerificationStatus(WorkerVerificationStatus.VERIFIED))
                .pendingWorkers(workerRepository.countByVerificationStatus(WorkerVerificationStatus.PENDING))
                .pendingTasks(taskRepository.countByStatus(TaskStatus.PENDING_REVIEW))
                .openTasks(taskRepository.countByStatus(TaskStatus.OPEN))
                .inProgressTasks(taskRepository.countByStatus(TaskStatus.IN_PROGRESS))
                .completedTasks(taskRepository.countByStatus(TaskStatus.COMPLETED))
                .pendingBookings(bookingRepository.countByStatus(BookingStatus.PENDING))
                .acceptedBookings(bookingRepository.countByStatus(BookingStatus.ACCEPTED))
                .completedBookings(bookingRepository.countByStatus(BookingStatus.COMPLETED))
                .totalNotifications(notificationRepository.countByUserIdAndIsReadFalse(currentUser.getId()))
                .latestPendingWorkers(workerRepository
                        .findTop5ByVerificationStatusOrderByIdDesc(WorkerVerificationStatus.PENDING)
                        .stream()
                        .map(worker -> workerMapper.toDto(worker, true))
                        .toList())
                .latestPendingTasks(taskRepository.findTop5ByStatusOrderByIdDesc(TaskStatus.PENDING_REVIEW)
                        .stream()
                        .map(taskMapper::toDto)
                        .toList())
                .build();
    }
}
