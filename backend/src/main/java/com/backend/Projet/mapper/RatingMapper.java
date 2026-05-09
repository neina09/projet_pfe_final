package com.backend.Projet.mapper;

import com.backend.Projet.dto.RatingResponseDto;
import com.backend.Projet.model.Rating;
import org.springframework.stereotype.Component;

@Component
public class RatingMapper {

    public RatingResponseDto toDto(Rating rating) {
        if (rating == null) {
            return null;
        }
        return RatingResponseDto.builder()
                .id(rating.getId())
                .workerId(rating.getWorker().getId())
                .workerName(rating.getWorker().getName())
                .userId(rating.getUser().getId())
                .userName(rating.getUser().getName())
                .bookingId(rating.getBooking() != null ? rating.getBooking().getId() : null)
                .taskId(rating.getTask() != null ? rating.getTask().getId() : null)
                .stars(rating.getStars())
                .comment(rating.getComment())
                .userImageUrl(rating.getUser().getImageUrl())
                .createdAt(rating.getCreatedAt())
                .build();
    }
}
