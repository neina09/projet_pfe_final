package com.backend.Projet.dto;

import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.WorkerVerificationStatus;
import lombok.*;

@Data
@Builder
public class WorkerResponseDto {
    private Long id;
    private String name;
    private String job;
    private String address;
    private String bio;
    private int salary;
    private String imageUrl;
    private String identityDocumentUrl;
    private String nationalIdNumber;
    private String phoneNumber;
    private WorkerAvailability availability;
    private double averageRating;
    private WorkerVerificationStatus verificationStatus;
    private String verificationNotes;
    private Long userId;
    private String username;
    private String userPhone;
    private boolean verified;
}
