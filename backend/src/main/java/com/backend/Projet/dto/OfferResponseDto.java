package com.backend.Projet.dto;

import com.backend.Projet.model.OfferStatus;
import lombok.*;
import java.time.LocalDateTime;

@Data @Builder
public class OfferResponseDto {
    private Long          id;
    private Long          taskId;
    private String        taskTitle;
    private Long          taskUserId;
    private String        taskUserName;
    private String        taskUserImageUrl;
    private Long          workerId;
    private String        workerName;
    private String        workerJob;
    private String        workerImageUrl;
    private String        message;
    private OfferStatus   status;
    private String        workerAvailability;
    private LocalDateTime createdAt;
}
