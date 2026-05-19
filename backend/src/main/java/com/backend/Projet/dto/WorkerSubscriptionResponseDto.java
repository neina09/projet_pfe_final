package com.backend.Projet.dto;

import com.backend.Projet.model.SubscriptionPaymentMethod;
import com.backend.Projet.model.SubscriptionPaymentStatus;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class WorkerSubscriptionResponseDto {
    private Long workerId;
    private BigDecimal amount;
    private Integer durationMonths;
    private String recipientName;
    private String accountNumber;
    private String bankName;
    private String qrImageUrl;
    private SubscriptionPaymentMethod paymentMethod;
    private SubscriptionPaymentStatus paymentStatus;
    private String transferReference;
    private String receiptUrl;
    private String verificationNotes;
    private boolean active;
    private LocalDateTime startsAt;
    private LocalDateTime endsAt;
    private LocalDateTime verifiedAt;
}
