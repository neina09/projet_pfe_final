package com.backend.Projet.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "worker_subscriptions", indexes = {
        @Index(name = "idx_worker_subscription_worker_id", columnList = "worker_id"),
        @Index(name = "idx_worker_subscription_status", columnList = "payment_status"),
        @Index(name = "idx_worker_subscription_ends_at", columnList = "ends_at")
})
public class WorkerSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_id", nullable = false, unique = true)
    private Worker worker;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 30)
    @Builder.Default
    private SubscriptionPaymentMethod paymentMethod = SubscriptionPaymentMethod.BANK_QR;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false, length = 30)
    @Builder.Default
    private SubscriptionPaymentStatus paymentStatus = SubscriptionPaymentStatus.NOT_SUBMITTED;

    @Column(name = "amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "duration_months", nullable = false)
    @Builder.Default
    private Integer durationMonths = 6;

    @Column(name = "receipt_url", length = 2048)
    private String receiptUrl;

    @Column(name = "transfer_reference", length = 120, unique = true)
    private String transferReference;

    @Column(name = "verification_notes", length = 500)
    private String verificationNotes;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "starts_at")
    private LocalDateTime startsAt;

    @Column(name = "ends_at")
    private LocalDateTime endsAt;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = false;
}
