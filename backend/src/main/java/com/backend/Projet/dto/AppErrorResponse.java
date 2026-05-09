package com.backend.Projet.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AppErrorResponse {
    private int status;
    private String error;
    private String message;
    private LocalDateTime timestamp;
}
