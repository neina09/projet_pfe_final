package com.backend.Projet.service;

import com.backend.Projet.dto.WorkerRequestDto;
import com.backend.Projet.mapper.WorkerMapper;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerVerificationStatus;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.OfferRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import org.springframework.mock.web.MockMultipartFile;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkerServiceTest {

    @Mock
    private WorkerRepository workerRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private NotificationService notificationService;

    private WorkerService workerService;

    @BeforeEach
    void setUp() {
        workerService = new WorkerService(
                workerRepository,
                ratingRepository,
                taskRepository,
                bookingRepository,
                offerRepository,
                userRepository,
                new WorkerMapper(),
                fileStorageService,
                notificationService
        );
    }

    @Test
    void registerAsWorkerShouldNormalizePhoneAndMarkPendingVerification() {
        User currentUser = new User();
        currentUser.setId(1L);

        WorkerRequestDto dto = new WorkerRequestDto();
        dto.setName("Ahmed");
        dto.setJob("Electrician");
        dto.setAddress("Nouakchott");
        dto.setSalary(1000);
        dto.setPhoneNumber("+22222123456");
        dto.setNationalIdNumber("MR123456");

        when(workerRepository.findByUserId(1L)).thenReturn(Optional.empty());
        when(workerRepository.findByPhoneNumber("22123456")).thenReturn(Optional.empty());
        when(workerRepository.findByNationalIdNumber("MR123456")).thenReturn(Optional.empty());
        when(workerRepository.save(any(Worker.class))).thenAnswer(invocation -> {
            Worker worker = invocation.getArgument(0);
            worker.setId(10L);
            return worker;
        });

        var response = workerService.registerAsWorker(dto, currentUser);

        assertEquals("22123456", response.getPhoneNumber());
        assertEquals(WorkerVerificationStatus.PENDING, response.getVerificationStatus());
        verify(notificationService).sendNotificationToRole(eq(Role.ADMIN), any(), any());
    }

    @Test
    void verifyWorkerShouldRequireAdmin() {
        User currentUser = new User();
        currentUser.setRole(Role.USER);

        assertThrows(UnauthorizedException.class, () -> workerService.verifyWorker(1L, currentUser, null));
    }

    @Test
    void uploadIdentityDocumentShouldMoveWorkerBackToPending() {
        User currentUser = new User();
        currentUser.setId(1L);

        Worker worker = Worker.builder()
                .id(10L)
                .user(currentUser)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        MockMultipartFile file = new MockMultipartFile("file", "id.pdf", "application/pdf", "demo".getBytes());

        when(workerRepository.findById(10L)).thenReturn(Optional.of(worker));
        when(fileStorageService.storeWorkerDocument(file)).thenReturn("/uploads/workers/documents/demo.pdf");
        when(workerRepository.save(any(Worker.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = workerService.uploadIdentityDocument(10L, file, currentUser);

        assertEquals(WorkerVerificationStatus.PENDING, response.getVerificationStatus());
        assertEquals("/uploads/workers/documents/demo.pdf", response.getIdentityDocumentUrl());
        verify(notificationService).sendNotificationToRole(eq(Role.ADMIN), any(), any());
    }

    @Test
    void getWorkerForOwnerOrAdminShouldIncludeSensitiveFields() {
        User owner = new User();
        owner.setId(1L);
        owner.setRole(Role.WORKER);
        owner.setUsername("worker1");
        owner.setPhone("22220000");

        Worker worker = Worker.builder()
                .id(10L)
                .name("Ahmed")
                .job("Electrician")
                .address("Nouakchott")
                .salary(1000)
                .phoneNumber("22123456")
                .nationalIdNumber("1234567890")
                .identityDocumentUrl("/uploads/workers/id.pdf")
                .verificationStatus(WorkerVerificationStatus.PENDING)
                .user(owner)
                .build();

        when(workerRepository.findById(10L)).thenReturn(Optional.of(worker));
        when(ratingRepository.calculateAverageRating(10L)).thenReturn(4.5);

        var response = workerService.getWorkerForOwnerOrAdmin(10L, owner);

        assertNotNull(response);
        assertEquals("1234567890", response.getNationalIdNumber());
        assertEquals("/uploads/workers/id.pdf", response.getIdentityDocumentUrl());
        assertEquals(4.5, response.getAverageRating());
    }

    @Test
    void deleteWorkerShouldClearReferencesBeforeDeletingWorker() {
        User admin = new User();
        admin.setRole(Role.ADMIN);

        User workerUser = new User();
        workerUser.setId(9L);
        workerUser.setRole(Role.WORKER);

        Worker worker = Worker.builder()
                .id(10L)
                .user(workerUser)
                .imageUrl("/uploads/workers/profile.jpg")
                .identityDocumentUrl("/uploads/workers/id.pdf")
                .build();

        when(workerRepository.findById(10L)).thenReturn(Optional.of(worker));

        workerService.deleteWorker(10L, admin);

        assertEquals(Role.USER, workerUser.getRole());
        verify(userRepository).save(workerUser);
        verify(ratingRepository).deleteByWorkerId(10L);
        verify(offerRepository).deleteByWorkerId(10L);
        verify(bookingRepository).deleteByWorkerId(10L);
        verify(taskRepository).clearAssignedWorkerByWorkerId(10L);
        verify(fileStorageService).deleteStoredFile("/uploads/workers/profile.jpg");
        verify(fileStorageService).deleteStoredFile("/uploads/workers/id.pdf");
        verify(workerRepository).delete(worker);
    }
}
