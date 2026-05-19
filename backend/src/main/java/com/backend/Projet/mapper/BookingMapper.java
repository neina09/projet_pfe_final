package com.backend.Projet.mapper;

import com.backend.Projet.dto.BookingResponseDto;
import com.backend.Projet.model.Booking;
import org.springframework.stereotype.Component;

@Component
public class BookingMapper {

    public BookingResponseDto toDto(Booking booking) {
        if (booking == null) {
            return null;
        }
        String workerImageUrl = booking.getWorker().getImageUrl();
        // Unified image logic: prioritize User's image if linked
        if (booking.getWorker().getUser() != null && booking.getWorker().getUser().getImageUrl() != null && !booking.getWorker().getUser().getImageUrl().isBlank()) {
            workerImageUrl = booking.getWorker().getUser().getImageUrl();
        }

        return BookingResponseDto.builder()
                .id(booking.getId())
                .workerId(booking.getWorker().getId())
                .workerUserId(booking.getWorker().getUser().getId())
                .workerName(booking.getWorker().getName())
                .workerJob(booking.getWorker().getJob())
                .workerImageUrl(workerImageUrl)
                .userId(booking.getUser().getId())
                .userName(booking.getUser().getName())
                .userImageUrl(booking.getUser().getImageUrl())
                .address(booking.getAddress())
                .locationDetails(booking.getLocationDetails())
                .bookingDate(booking.getBookingDate())
                .clientPhone(booking.getClientPhone())
                .workerPhone(booking.getWorker().getPhoneNumber() != null ? booking.getWorker().getPhoneNumber() : (booking.getWorker().getUser() != null ? booking.getWorker().getUser().getPhone() : null))
                .status(booking.getStatus())
                .description(booking.getDescription())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
