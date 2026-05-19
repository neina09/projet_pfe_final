package com.backend.Projet.controller;

import com.backend.Projet.dto.WorkerSubscriptionResponseDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.WorkerSubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerSubscriptionController {

    private final WorkerSubscriptionService workerSubscriptionService;

    @GetMapping("/me/subscription")
    public ResponseEntity<WorkerSubscriptionResponseDto> getMySubscription(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerSubscriptionService.getMySubscription(currentUser));
    }

    @PostMapping(value = "/{id}/subscription-receipt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkerSubscriptionResponseDto> submitSubscriptionReceipt(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @RequestParam String transferReference,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerSubscriptionService.submitReceipt(id, file, transferReference, currentUser));
    }

    @PatchMapping("/admin/{id}/subscription/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkerSubscriptionResponseDto> approveSubscriptionPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerSubscriptionService.approveSubscriptionPayment(id, currentUser));
    }

    @PatchMapping("/admin/{id}/subscription/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkerSubscriptionResponseDto> rejectSubscriptionPayment(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerSubscriptionService.rejectSubscriptionPayment(id, currentUser));
    }
}
