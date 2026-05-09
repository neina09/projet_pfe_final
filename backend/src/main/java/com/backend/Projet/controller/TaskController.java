package com.backend.Projet.controller;

import com.backend.Projet.dto.*;
import com.backend.Projet.model.User;
import com.backend.Projet.model.TaskStatus;
import com.backend.Projet.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    // ── Public — بدون login ──

    @GetMapping
    public ResponseEntity<PageResponseDto<TaskResponseDto>> getTasks(
            @RequestParam(required = false) TaskStatus status,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(taskService.getTasksByStatus(status, pageable));
    }

    @GetMapping("/open")
    public ResponseEntity<PageResponseDto<TaskResponseDto>> getOpenTasks(
            @RequestParam(required = false) Double userLatitude,
            @RequestParam(required = false) Double userLongitude,
            @PageableDefault(size = 10, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(
                taskService.getOpenTasks(pageable, userLatitude, userLongitude));
    }

    @GetMapping("/open/search")
    public ResponseEntity<PageResponseDto<TaskResponseDto>> searchOpenTasks(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) String profession,
            @RequestParam(required = false) Double userLatitude,
            @RequestParam(required = false) Double userLongitude,
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(
                taskService.searchOpenTasks(
                        keyword, address, profession, pageable, userLatitude, userLongitude));
    }

    // FIX #1: getTaskById لا يحتاج User — يراه الجميع
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponseDto> getTaskById(
            @RequestParam(required = false) Double userLatitude,
            @RequestParam(required = false) Double userLongitude,
            @AuthenticationPrincipal User currentUser,
            @PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id, userLatitude, userLongitude, currentUser));
    }

    // ── USER actions ──

    @PostMapping
    public ResponseEntity<TaskResponseDto> createTask(
            @Valid @RequestBody TaskRequestDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.createTask(input, currentUser));
    }

    @GetMapping("/my-tasks")
    public ResponseEntity<PageResponseDto<TaskResponseDto>> getMyTasks(
            @RequestParam(required = false) TaskStatus status,
            @PageableDefault(size = 10, sort = "createdAt",
                    direction = Sort.Direction.DESC) Pageable pageable,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.getMyTasks(currentUser, status, pageable));
    }

    @GetMapping("/assigned-to-me")
    public ResponseEntity<List<TaskResponseDto>> getTasksAssignedToMe(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.getTasksAssignedToMe(currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskResponseDto> updateTask(
            @PathVariable Long id,
            @Valid @RequestBody TaskRequestDto input,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.updateTask(id, input, currentUser));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        taskService.deleteTask(id, currentUser);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/offers")
    public ResponseEntity<List<OfferResponseDto>> getOffersForTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.getOffersForTask(id, currentUser));
    }

    @PatchMapping("/offers/{offerId}/select")
    public ResponseEntity<OfferResponseDto> selectOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.selectOffer(offerId, currentUser));
    }

    @PatchMapping("/{id}/done")
    public ResponseEntity<TaskResponseDto> markDone(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.markDone(id, currentUser));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<TaskResponseDto> cancelTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.cancelTask(id, currentUser));
    }

    // ── WORKER actions ──

    @PostMapping("/{id}/offer")
    public ResponseEntity<OfferResponseDto> submitOffer(
            @PathVariable Long id,
            @Valid @RequestBody OfferRequestDto dto,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.submitOffer(id, dto, currentUser));
    }

    @GetMapping("/my-offers")
    public ResponseEntity<List<OfferResponseDto>> getMyOffers(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.getMyOffers(currentUser));
    }

    @PatchMapping("/offers/{offerId}/worker-accept")
    public ResponseEntity<OfferResponseDto> workerAccept(
            @PathVariable Long offerId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.workerAccept(offerId, currentUser));
    }

    @PatchMapping("/offers/{offerId}/worker-refuse")
    public ResponseEntity<OfferResponseDto> workerRefuse(
            @PathVariable Long offerId,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(
                taskService.workerRefuse(offerId, currentUser));
    }

    @PostMapping("/{id}/request-worker")
    public ResponseEntity<String> requestAnotherWorker(
            @PathVariable Long id,
            @Valid @RequestBody WorkerReferralRequestDto dto,
            @AuthenticationPrincipal User currentUser) {
        taskService.requestAnotherWorker(id, dto, currentUser);
        return ResponseEntity.ok("Worker request sent successfully");
    }

    @DeleteMapping("/offers/{offerId}")
    public ResponseEntity<Void> deleteOffer(
            @PathVariable Long offerId,
            @AuthenticationPrincipal User currentUser) {
        taskService.deleteOffer(offerId, currentUser);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/approve")
    public ResponseEntity<TaskResponseDto> approveTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.approveTask(id, currentUser));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<TaskResponseDto> rejectTask(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(taskService.rejectTask(id, currentUser));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PageResponseDto<TaskResponseDto>> getPendingTasks(
            @PageableDefault(size = 10) Pageable pageable) {
        return ResponseEntity.ok(taskService.getPendingTasks(pageable));
    }
}
