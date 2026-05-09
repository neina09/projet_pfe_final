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
        if ((workerImageUrl == null || workerImageUrl.isBlank())
                && booking.getWorker().getUser() != null
                && booking.getWorker().getUser().getImageUrl() != null
                && !booking.getWorker().getUser().getImageUrl().isBlank()) {
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
                .bookingDate(booking.getBookingDate())
                .status(booking.getStatus())
                .description(booking.getDescription())
                .price(booking.getPrice())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
