package com.backend.Projet.service;

import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.dto.BookingResponseDto;
import com.backend.Projet.mapper.BookingMapper;
import com.backend.Projet.model.Booking;
import com.backend.Projet.model.BookingStatus;
import com.backend.Projet.model.NotificationType;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.WorkerVerificationStatus;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private WorkerRepository workerRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private UserRepository userRepository;

    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        bookingService = new BookingService(
                bookingRepository,
                ratingRepository,
                workerRepository,
                userRepository,
                notificationService,
                new BookingMapper()
        );
    }

    @Test
    void acceptBookingShouldKeepWorkerAvailabilityUnchangedAndNotifyUser() {
        User bookingUser = new User();
        bookingUser.setId(1L);
        bookingUser.setUsername("customer");

        User workerAccount = new User();
        workerAccount.setId(2L);
        workerAccount.setUsername("worker-account");

        Worker worker = Worker.builder()
                .id(3L)
                .name("Hamza")
                .job("Electrician")
                .phoneNumber("0611223344")
                .address("Casablanca")
                .salary(400)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .user(workerAccount)
                .build();

        Booking booking = Booking.builder()
                .id(5L)
                .user(bookingUser)
                .worker(worker)
                .status(BookingStatus.PENDING)
                .description("Install lights")
                .address("Casablanca")
                .bookingDate(LocalDateTime.now().plusDays(1))
                .price(250.0)
                .build();

        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ratingRepository.existsByBookingId(5L)).thenReturn(false);

        BookingResponseDto response = bookingService.acceptBooking(5L, workerAccount);

        assertEquals(BookingStatus.ACCEPTED, response.getStatus());
        assertEquals(WorkerAvailability.AVAILABLE, worker.getAvailability());
        verify(workerRepository, never()).save(any(Worker.class));
        verify(notificationService).sendNotification(
                eq(bookingUser),
                contains("accepted"),
                eq(NotificationType.BOOKING_ACCEPTED)
        );
    }

    @Test
    void acceptBookingShouldRejectBusyWorker() {
        User bookingUser = new User();
        bookingUser.setId(1L);

        User workerAccount = new User();
        workerAccount.setId(2L);

        Worker worker = Worker.builder()
                .id(3L)
                .name("Hamza")
                .availability(WorkerAvailability.BUSY)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .user(workerAccount)
                .build();

        Booking booking = Booking.builder()
                .id(5L)
                .user(bookingUser)
                .worker(worker)
                .status(BookingStatus.PENDING)
                .description("Install lights")
                .address("Casablanca")
                .bookingDate(LocalDateTime.now().plusDays(1))
                .price(250.0)
                .build();

        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));

        BusinessException exception = assertThrows(BusinessException.class,
                () -> bookingService.acceptBooking(5L, workerAccount));

        assertEquals("Worker is not available", exception.getMessage());
        verify(bookingRepository, never()).save(any(Booking.class));
    }

    @Test
    void getMyBookingsShouldPopulateRatingFlagAndWorkerJob() {
        User bookingUser = new User();
        bookingUser.setId(1L);
        bookingUser.setUsername("customer");

        User workerAccount = new User();
        workerAccount.setId(2L);

        Worker worker = Worker.builder()
                .id(3L)
                .name("Hamza")
                .job("Electrician")
                .user(workerAccount)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        Booking booking = Booking.builder()
                .id(5L)
                .user(bookingUser)
                .worker(worker)
                .status(BookingStatus.COMPLETED)
                .description("Install lights")
                .address("Casablanca")
                .bookingDate(LocalDateTime.now().plusDays(1))
                .price(250.0)
                .build();

        when(bookingRepository.findByUserId(1L)).thenReturn(List.of(booking));
        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(ratingRepository.existsByBookingId(5L)).thenReturn(false);

        List<BookingResponseDto> response = bookingService.getMyBookings(bookingUser);

        assertEquals(1, response.size());
        assertEquals("Electrician", response.getFirst().getWorkerJob());
        assertFalse(response.getFirst().isRated());
    }

    @Test
    void cancelBookingShouldNotifyWorker() {
        User bookingUser = new User();
        bookingUser.setId(1L);
        bookingUser.setUsername("Salma");

        User workerAccount = new User();
        workerAccount.setId(2L);

        Worker worker = Worker.builder()
                .id(3L)
                .name("Hamza")
                .user(workerAccount)
                .availability(WorkerAvailability.AVAILABLE)
                .verificationStatus(WorkerVerificationStatus.VERIFIED)
                .build();

        Booking booking = Booking.builder()
                .id(5L)
                .user(bookingUser)
                .worker(worker)
                .status(BookingStatus.PENDING)
                .description("Install lights")
                .address("Casablanca")
                .bookingDate(LocalDateTime.now().plusDays(1))
                .price(250.0)
                .build();

        when(bookingRepository.findById(5L)).thenReturn(Optional.of(booking));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(ratingRepository.existsByBookingId(5L)).thenReturn(false);

        BookingResponseDto response = bookingService.cancelBooking(5L, bookingUser);

        assertEquals(BookingStatus.CANCELLED, response.getStatus());
        verify(notificationService).sendNotification(
                eq(workerAccount),
                contains("cancelled"),
                eq(NotificationType.BOOKING_CANCELLED)
        );
    }
}
