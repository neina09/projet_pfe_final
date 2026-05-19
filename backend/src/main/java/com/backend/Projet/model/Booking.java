package com.backend.Projet.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_booking_user_id",   columnList = "user_id"),
        @Index(name = "idx_booking_worker_id", columnList = "worker_id"),
        @Index(name = "idx_booking_status",    columnList = "status")
})
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false)
    private Worker worker;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String address;

    @Column(name = "location_details")
    private String locationDetails;

    @Column(nullable = false, name = "booking_date")
    private LocalDateTime bookingDate;

    @Column(name = "client_phone")
    private String clientPhone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}