package com.backend.Projet.service;

import com.backend.Projet.mapper.TaskMapper;
import com.backend.Projet.mapper.WorkerMapper;
import com.backend.Projet.model.BookingStatus;
import com.backend.Projet.model.TaskStatus;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerVerificationStatus;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.NotificationRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private WorkerRepository workerRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private RatingRepository ratingRepository;

    private AdminService adminService;

    @BeforeEach
    void setUp() {
        adminService = new AdminService(
                userRepository,
                workerRepository,
                taskRepository,
                bookingRepository,
                notificationRepository,
                new WorkerMapper(),
                new TaskMapper(ratingRepository)
        );
    }

    @Test
    void getDashboardShouldAggregatePlatformStats() {
        when(userRepository.count()).thenReturn(20L);
        when(userRepository.countByEnabledTrue()).thenReturn(18L);
        when(workerRepository.countByVerificationStatus(WorkerVerificationStatus.VERIFIED)).thenReturn(5L);
        when(workerRepository.countByVerificationStatus(WorkerVerificationStatus.PENDING)).thenReturn(2L);
        when(taskRepository.countByStatus(TaskStatus.PENDING_REVIEW)).thenReturn(4L);
        when(taskRepository.countByStatus(TaskStatus.OPEN)).thenReturn(9L);
        when(taskRepository.countByStatus(TaskStatus.IN_PROGRESS)).thenReturn(3L);
        when(taskRepository.countByStatus(TaskStatus.COMPLETED)).thenReturn(11L);
        when(bookingRepository.countByStatus(BookingStatus.PENDING)).thenReturn(4L);
        when(bookingRepository.countByStatus(BookingStatus.ACCEPTED)).thenReturn(2L);
        when(bookingRepository.countByStatus(BookingStatus.COMPLETED)).thenReturn(6L);
        User currentUser = new User();
        currentUser.setId(99L);
        when(notificationRepository.countByUserIdAndIsReadFalse(99L)).thenReturn(30L);
        when(workerRepository.findTop5ByVerificationStatusOrderByIdDesc(WorkerVerificationStatus.PENDING))
                .thenReturn(List.of(Worker.builder().id(1L).name("Ahmed").build()));
        when(taskRepository.findTop5ByStatusOrderByIdDesc(TaskStatus.PENDING_REVIEW))
                .thenReturn(List.of());

        var response = adminService.getDashboard(currentUser);

        assertEquals(20L, response.getTotalUsers());
        assertEquals(5L, response.getTotalWorkers());
        assertEquals(5L, response.getVerifiedWorkers());
        assertEquals(4L, response.getPendingTasks());
        assertEquals(1, response.getLatestPendingWorkers().size());
        assertEquals(30L, response.getTotalNotifications());
    }
}
