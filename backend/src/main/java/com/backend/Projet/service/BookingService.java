package com.backend.Projet.service;

import com.backend.Projet.dto.BookingRequestDto;
import com.backend.Projet.dto.BookingResponseDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.model.*;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RatingRepository ratingRepository;
    private final WorkerRepository workerRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final com.backend.Projet.mapper.BookingMapper bookingMapper;


    @Transactional
    public BookingResponseDto createBooking(BookingRequestDto input, User currentUser) {
        User managedUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Worker worker = workerRepository.findById(input.getWorkerId())
                .orElseThrow(() -> new ResourceNotFoundException("Worker not found"));
        if (worker.getVerificationStatus() != WorkerVerificationStatus.VERIFIED) {
            throw new BusinessException("Worker is not verified yet");
        }

        if (worker.getAvailability() == WorkerAvailability.BUSY) {
            throw new BusinessException("Worker is not available");
        }

        if (worker.getUser().getId().equals(currentUser.getId())) {
            throw new BusinessException("You cannot book yourself");
        }

        Booking booking = Booking.builder()
                .user(managedUser)
                .worker(worker)
                .description(input.getDescription())
                .address(input.getAddress())
                .bookingDate(input.getBookingDate())
                .price(input.getPrice())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);

        // Notify Worker
        notificationService.sendNotification(
                worker.getUser(),
                "You have a new booking request from " + currentUser.getName(),
                NotificationType.BOOKING_REQUEST
        );

        return toBookingDto(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getMyBookings(User currentUser) {
        return bookingRepository.findByUserId(currentUser.getId())
                .stream().map(this::toBookingDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<BookingResponseDto> getMyBookingsPaged(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("bookingDate").descending());
        return bookingRepository.findByUserId(currentUser.getId(), pageable)
                .map(this::toBookingDto);
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDto> getMyRequests(User currentUser) {
        return bookingRepository.findByWorkerUserId(currentUser.getId())
                .stream().map(this::toBookingDto).toList();
    }

    @Transactional(readOnly = true)
    public Page<BookingResponseDto> getMyRequestsPaged(User currentUser, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("bookingDate").descending());
        return bookingRepository.findByWorkerUserId(currentUser.getId(), pageable)
                .map(this::toBookingDto);
    }

    @Transactional
    public BookingResponseDto acceptBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getWorker().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BusinessException("Booking is not pending");
        }

        Worker worker = booking.getWorker();
        if (worker.getAvailability() != WorkerAvailability.AVAILABLE) {
            throw new BusinessException("Worker is not available");
        }

        booking.setStatus(BookingStatus.ACCEPTED);

        Booking saved = bookingRepository.save(booking);

        // Notify User
        notificationService.sendNotification(
                booking.getUser(),
                "Your booking with " + booking.getWorker().getName() + " has been accepted",
                NotificationType.BOOKING_ACCEPTED
        );

        return toBookingDto(saved);
    }

    @Transactional
    public BookingResponseDto rejectBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getWorker().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BusinessException("Booking is not pending");
        }

        booking.setStatus(BookingStatus.REJECTED);
        
        Booking saved = bookingRepository.save(booking);

        // Notify User
        notificationService.sendNotification(
                booking.getUser(),
                "Your booking with " + booking.getWorker().getName() + " was rejected",
                NotificationType.BOOKING_REJECTED
        );

        return toBookingDto(saved);
    }

    @Transactional
    public BookingResponseDto completeBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getWorker().getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.ACCEPTED) {
            throw new BusinessException("Booking is not accepted yet");
        }

        booking.setStatus(BookingStatus.COMPLETED);

        Booking saved = bookingRepository.save(booking);

        notificationService.sendNotification(
                booking.getUser(),
                "Your booking with " + booking.getWorker().getName() + " has been completed",
                NotificationType.BOOKING_COMPLETED
        );

        return toBookingDto(saved);
    }

    @Transactional
    public BookingResponseDto cancelBooking(Long bookingId, User currentUser) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new BusinessException("Can only cancel pending bookings");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);

        notificationService.sendNotification(
                booking.getWorker().getUser(),
                currentUser.getName() + " cancelled the booking request",
                NotificationType.BOOKING_CANCELLED
        );

        return toBookingDto(saved);
    }

    @Transactional
    public void deleteBooking(Long id, User currentUser) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        boolean isOwner = booking.getUser().getId().equals(currentUser.getId());
        boolean isWorker = booking.getWorker().getUser().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole() == Role.ADMIN;

        if (!isOwner && !isWorker && !isAdmin) {
            throw new UnauthorizedException("Not authorized");
        }

        ratingRepository.deleteByBookingId(id);
        bookingRepository.delete(booking);
    }

    private BookingResponseDto toBookingDto(Booking booking) {
        Booking hydratedBooking = bookingRepository.findById(booking.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        BookingResponseDto dto = bookingMapper.toDto(hydratedBooking);
        dto.setRated(ratingRepository.existsByBookingId(hydratedBooking.getId()));
        return dto;
    }
}
