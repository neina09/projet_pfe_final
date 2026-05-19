package com.backend.Projet.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class BookingUpdateDto {

    @NotBlank(message = "Description is required")
    @Size(max = 1000, message = "Description must not exceed 1000 characters")
    private String description;

    @NotBlank(message = "Address is required")
    @Size(max = 255, message = "Address must not exceed 255 characters")
    private String address;

    @NotNull(message = "Booking date is required")
    private LocalDateTime bookingDate;

    @JsonProperty("clientPhone")
    private String clientPhone;

    @JsonProperty("locationDetails")
    private String locationDetails;
}
