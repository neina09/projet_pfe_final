package com.backend.Projet.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "workers", indexes = {
        @Index(name = "idx_worker_user_id",      columnList = "user_id"),
        @Index(name = "idx_worker_job",          columnList = "job"),
        @Index(name = "idx_worker_availability", columnList = "availability")
})
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Phone number is required")
    @Column(name = "phone_number", unique = true, nullable = false)
    @JsonProperty("phoneNumber")
    private String phoneNumber;

    @Column(name = "image_url", length = 2048)
    private String imageUrl;

    @Column(name = "identity_document_url", length = 2048)
    private String identityDocumentUrl;

    @NotBlank(message = "Job is required")
    @Column(nullable = false)
    @JsonProperty("job")
    private String job;

    @NotBlank(message = "Name is required")
    @Column(nullable = false)
    @JsonProperty("name")
    private String name;

    @NotBlank(message = "Address is required")
    @Column(name = "adresse", nullable = false)
    @JsonProperty("address")
    private String address;

    @Column(name = "bio", length = 1000)
    @JsonProperty("bio")
    private String bio;



    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private WorkerAvailability availability = WorkerAvailability.AVAILABLE;

    @Column(name = "average_rating")
    @Builder.Default
    private double averageRating = 0.0;

    @Column(name = "national_id_number", unique = true)
    private String nationalIdNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    @Builder.Default
    private WorkerVerificationStatus verificationStatus = WorkerVerificationStatus.PENDING;

    @Column(name = "verification_notes", length = 500)
    private String verificationNotes;

    @Column(name = "subscription_required", nullable = false)
    @Builder.Default
    private boolean subscriptionRequired = false;

    @OneToOne(mappedBy = "worker", fetch = FetchType.EAGER, cascade = CascadeType.ALL, orphanRemoval = true)
    private WorkerSubscription subscription;
}
