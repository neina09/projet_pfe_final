// BookingResponseDto.java
package com.backend.Projet.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.backend.Projet.model.BookingStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
public class BookingResponseDto {
    private Long id;
    private Long userId;
    private String userName;
    private Long workerId;
    private Long workerUserId;
    private String workerName;
    private String workerJob;
    private String workerImageUrl;
    private String userImageUrl;
    private BookingStatus status;
    private String description;
    private String address;
    private LocalDateTime bookingDate;
    private Double price;
    @JsonProperty("isRated")
    private boolean isRated;
    private LocalDateTime createdAt;
}
