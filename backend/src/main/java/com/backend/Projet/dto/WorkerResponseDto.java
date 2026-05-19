package com.backend.Projet.dto;

import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.model.SubscriptionPaymentStatus;
import com.backend.Projet.model.WorkerVerificationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder(toBuilder = true)
public class WorkerResponseDto {
    private Long id;
    private String name;
    private String job;
    private String address;
    private String bio;

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
    private boolean subscriptionRequired;
    private boolean subscriptionActive;
    private SubscriptionPaymentStatus subscriptionPaymentStatus;
    private LocalDateTime subscriptionEndsAt;
    private String subscriptionTransferReference;
    private String subscriptionReceiptUrl;
    private String subscriptionVerificationNotes;
    private String subscriptionOcrRawText;
    private LocalDateTime subscriptionVerifiedAt;
    private boolean subscriptionLegacyRecord;
    private String subscriptionLegacyNote;
}
