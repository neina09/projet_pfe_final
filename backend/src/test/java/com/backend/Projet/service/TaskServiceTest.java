package com.backend.Projet.service;

import com.backend.Projet.dto.OfferRequestDto;
import com.backend.Projet.dto.OfferResponseDto;
import com.backend.Projet.dto.WorkerReferralRequestDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.mapper.OfferMapper;
import com.backend.Projet.mapper.TaskMapper;
import com.backend.Projet.model.Offer;
import com.backend.Projet.model.OfferStatus;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.Task;
import com.backend.Projet.model.TaskStatus;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.WorkerVerificationStatus;
import com.backend.Projet.repository.OfferRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private WorkerRepository workerRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RatingRepository ratingRepository;

    private TaskService taskService;

    @BeforeEach
    void setUp() {
        taskService = new TaskService(
                taskRepository,
                offerRepository,
                ratingRepository,
                workerRepository,
                userRepository,
                notificationService,
                new TaskMapper(ratingRepository),
                new OfferMapper()
        );
    }

    @Test
    void submitOfferShouldCreateOfferAndNotifyTaskOwner() {
        User taskOwner = new User();
        taskOwner.setId(10L);
        taskOwner.setUsername("task-owner");

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.OPEN)
                .user(taskOwner)
                .description("Kitchen sink")
                .address("Rabat")
                .build();

        User workerUser = new User();
        workerUser.setId(20L);
        workerUser.setUsername("worker-user");
        workerUser.setRole(Role.WORKER);

        Worker worker = Worker.builder()
                .id(30L)
                .name("Ali")
                .job("Plumber")
                .phoneNumber("0611223344")
                .address("Sale")
                .salary(300)
                .user(workerUser)
                .availability(com.backend.Projet.model.WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        OfferRequestDto dto = new OfferRequestDto();
        dto.setMessage("I can do it today");

        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(workerRepository.findByUserId(20L)).thenReturn(Optional.of(worker));
        when(offerRepository.existsByTaskIdAndWorkerId(100L, 30L)).thenReturn(false);
        when(offerRepository.save(any(Offer.class))).thenAnswer(invocation -> {
            Offer offer = invocation.getArgument(0);
            offer.setId(1L);
            return offer;
        });

        OfferResponseDto response = taskService.submitOffer(100L, dto, workerUser);

        assertEquals(1L, response.getId());
        assertEquals("Fix sink", response.getTaskTitle());
        assertEquals("Ali", response.getWorkerName());

        ArgumentCaptor<Offer> captor = ArgumentCaptor.forClass(Offer.class);
        verify(offerRepository).save(captor.capture());
        assertEquals("I can do it today", captor.getValue().getMessage());
        verify(notificationService).sendNotification(
                eq(taskOwner),
                contains("new offer"),
                any()
        );
    }

    @Test
    void submitOfferShouldRejectDuplicateOffer() {
        User taskOwner = new User();
        taskOwner.setId(10L);

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.OPEN)
                .user(taskOwner)
                .description("Kitchen sink")
                .build();

        User workerUser = new User();
        workerUser.setId(20L);
        workerUser.setRole(Role.WORKER);

        Worker worker = Worker.builder()
                .id(30L)
                .name("Ali")
                .job("Plumber")
                .phoneNumber("0611223344")
                .address("Sale")
                .salary(300)
                .user(workerUser)
                .availability(com.backend.Projet.model.WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        OfferRequestDto dto = new OfferRequestDto();
        dto.setMessage("I can do it today");

        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(workerRepository.findByUserId(20L)).thenReturn(Optional.of(worker));
        when(offerRepository.existsByTaskIdAndWorkerId(100L, 30L)).thenReturn(true);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> taskService.submitOffer(100L, dto, workerUser));

        assertEquals("You already submitted an offer on this task", exception.getMessage());
        verify(offerRepository, never()).save(any(Offer.class));
    }

    @Test
    void selectOfferShouldCloseOtherPendingOffers() {
        User taskOwner = new User();
        taskOwner.setId(10L);

        User workerUser1 = new User();
        workerUser1.setId(20L);
        Worker worker1 = Worker.builder().id(30L).name("Ali").user(workerUser1).build();

        User workerUser2 = new User();
        workerUser2.setId(21L);
        Worker worker2 = Worker.builder().id(31L).name("Sara").user(workerUser2).build();

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.OPEN)
                .user(taskOwner)
                .build();

        Offer selectedOffer = Offer.builder()
                .id(1L)
                .task(task)
                .worker(worker1)
                .message("First offer")
                .status(OfferStatus.PENDING)
                .build();

        Offer otherOffer = Offer.builder()
                .id(2L)
                .task(task)
                .worker(worker2)
                .message("Second offer")
                .status(OfferStatus.PENDING)
                .build();

        when(offerRepository.findById(1L)).thenReturn(Optional.of(selectedOffer));
        when(offerRepository.findByTaskId(100L)).thenReturn(java.util.List.of(selectedOffer, otherOffer));
        when(offerRepository.save(any(Offer.class))).thenAnswer(invocation -> invocation.getArgument(0));

        OfferResponseDto response = taskService.selectOffer(1L, taskOwner);

        assertEquals(OfferStatus.SELECTED, response.getStatus());
        assertEquals(OfferStatus.CLOSED, otherOffer.getStatus());
        verify(offerRepository, times(2)).save(any(Offer.class));
    }

    @Test
    void workerAcceptShouldRejectWhenTaskIsNoLongerOpen() {
        User taskOwner = new User();
        taskOwner.setId(10L);

        User workerUser = new User();
        workerUser.setId(20L);

        Worker worker = Worker.builder()
                .id(30L)
                .name("Ali")
                .user(workerUser)
                .build();

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.IN_PROGRESS)
                .user(taskOwner)
                .assignedWorker(worker)
                .build();

        Offer offer = Offer.builder()
                .id(1L)
                .task(task)
                .worker(worker)
                .message("I can do it")
                .status(OfferStatus.SELECTED)
                .build();

        when(offerRepository.findById(1L)).thenReturn(Optional.of(offer));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> taskService.workerAccept(1L, workerUser));

        assertEquals("Task is no longer available", exception.getMessage());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void getTaskByIdShouldHideClosedTasks() {
        User taskOwner = new User();
        taskOwner.setId(10L);
        taskOwner.setUsername("task-owner");

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.COMPLETED)
                .user(taskOwner)
                .build();

        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));

        assertThrows(ResourceNotFoundException.class, () -> taskService.getTaskById(100L));
    }

    @Test
    void requestAnotherWorkerShouldNotifyRequestedWorkerAndTaskOwner() {
        User taskOwner = new User();
        taskOwner.setId(10L);

        User requestingUser = new User();
        requestingUser.setId(20L);
        requestingUser.setRole(Role.WORKER);

        User requestedUser = new User();
        requestedUser.setId(21L);

        Task task = Task.builder()
                .id(100L)
                .title("Fix sink")
                .status(TaskStatus.OPEN)
                .user(taskOwner)
                .build();

        Worker requestingWorker = Worker.builder()
                .id(30L)
                .name("Ali")
                .job("Plumber")
                .phoneNumber("0611223344")
                .address("Sale")
                .salary(300)
                .user(requestingUser)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        Worker requestedWorker = Worker.builder()
                .id(31L)
                .name("Sara")
                .job("Plumber")
                .phoneNumber("0611223355")
                .address("Rabat")
                .salary(320)
                .user(requestedUser)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        WorkerReferralRequestDto dto = new WorkerReferralRequestDto();
        dto.setWorkerId(31L);
        dto.setMessage("Need backup on this task");

        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(workerRepository.findByUserId(20L)).thenReturn(Optional.of(requestingWorker));
        when(workerRepository.findById(31L)).thenReturn(Optional.of(requestedWorker));
        when(offerRepository.existsByTaskIdAndWorkerId(100L, 31L)).thenReturn(false);

        assertDoesNotThrow(() -> taskService.requestAnotherWorker(100L, dto, requestingUser));

        verify(notificationService).sendNotification(
                eq(requestedUser),
                contains("asked you to review task"),
                any()
        );
        verify(notificationService).sendNotification(
                eq(taskOwner),
                contains("requested help from Sara"),
                any()
        );
    }
}
