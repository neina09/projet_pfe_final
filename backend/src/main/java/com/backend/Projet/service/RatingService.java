package com.backend.Projet.service;

import com.backend.Projet.dto.RatingRequestDto;
import com.backend.Projet.dto.RatingResponseDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.exception.UnauthorizedException;
import com.backend.Projet.model.*;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RatingService {

    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final TaskRepository taskRepository;
    private final WorkerRepository workerRepository;
    private final UserRepository userRepository;
    private final com.backend.Projet.mapper.RatingMapper ratingMapper;


    @Transactional
    public RatingResponseDto addRating(Long bookingId, RatingRequestDto input, User currentUser) {
        User managedUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        if (!booking.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only rate your own bookings");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BusinessException("You can only rate completed bookings");
        }

        if (ratingRepository.findByBookingId(bookingId).isPresent()) {
            throw new BusinessException("You already rated this booking");
        }

        Rating rating = Rating.builder()
                .worker(booking.getWorker())
                .user(managedUser)
                .booking(booking)
                .task(null)
                .stars(input.getStars())
                .comment(input.getComment())
                .build();

        Rating saved = ratingRepository.save(rating);

        // تحديث متوسط التقييم في الـ Worker
        Double avg = ratingRepository.calculateAverageRating(booking.getWorker().getId());
        Worker worker = booking.getWorker();
        worker.setAverageRating(avg != null ? avg : 0.0);
        workerRepository.save(worker);

        return toRatingDto(saved);
    }

    @Transactional
    public RatingResponseDto addTaskRating(Long taskId, RatingRequestDto input, User currentUser) {
        User managedUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (!task.getUser().getId().equals(currentUser.getId())) {
            throw new UnauthorizedException("You can only rate your own tasks");
        }

        if (task.getStatus() != TaskStatus.COMPLETED) {
            throw new BusinessException("You can only rate completed tasks");
        }

        if (task.getAssignedWorker() == null) {
            throw new BusinessException("This task has no assigned worker");
        }

        if (ratingRepository.findByTaskId(taskId).isPresent()) {
            throw new BusinessException("You already rated this task");
        }

        Rating rating = Rating.builder()
                .worker(task.getAssignedWorker())
                .user(managedUser)
                .booking(null)
                .task(task)
                .stars(input.getStars())
                .comment(input.getComment())
                .build();

        Rating saved = ratingRepository.save(rating);
        updateWorkerAverageRating(task.getAssignedWorker());

        return toRatingDto(saved);
    }

    public List<RatingResponseDto> getWorkerRatings(Long workerId) {
        return ratingRepository.findByWorkerId(workerId)
                .stream().map(ratingMapper::toDto).toList();
    }

    private void updateWorkerAverageRating(Worker worker) {
        Double avg = ratingRepository.calculateAverageRating(worker.getId());
        worker.setAverageRating(avg != null ? avg : 0.0);
        workerRepository.save(worker);
    }

    private RatingResponseDto toRatingDto(Rating rating) {
        Rating hydratedRating = ratingRepository.findById(rating.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Rating not found"));
        return ratingMapper.toDto(hydratedRating);
    }
}
