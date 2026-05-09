package com.backend.Projet.controller;

import com.backend.Projet.dto.WorkerRequestDto;
import com.backend.Projet.dto.WorkerResponseDto;
import com.backend.Projet.model.User;
import com.backend.Projet.model.WorkerAvailability;
import com.backend.Projet.service.JwtService;
import com.backend.Projet.service.WorkerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/workers")
@RequiredArgsConstructor
public class WorkerController {

    private final WorkerService workerService;
    private final JwtService jwtService;

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> registerAsWorker(
            @Valid @RequestBody WorkerRequestDto dto,
            @AuthenticationPrincipal User currentUser) {
        WorkerResponseDto worker = workerService.registerAsWorker(dto, currentUser);

        String newToken = jwtService.generateToken(currentUser);

        Map<String, Object> response = new HashMap<>();
        response.put("worker", worker);
        response.put("token", newToken);
        response.put("expiresIn", jwtService.getExpirationTime());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/admin/create/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkerResponseDto> createWorker(
            @Valid @RequestBody WorkerRequestDto dto,
            @PathVariable Long userId) {
        return ResponseEntity.ok(workerService.createWorker(dto, userId));
    }

    @GetMapping("/admin/pending")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<WorkerResponseDto>> getPendingWorkers() {
        return ResponseEntity.ok(workerService.getWorkersPendingVerification());
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<WorkerResponseDto>> getAllWorkersForAdmin(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.getAllWorkersForAdmin(currentUser));
    }

    @PatchMapping("/admin/{id}/verify")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkerResponseDto> verifyWorker(
            @PathVariable Long id,
            @RequestParam(required = false) String notes,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.verifyWorker(id, currentUser, notes));
    }

    @PatchMapping("/admin/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<WorkerResponseDto> rejectWorker(
            @PathVariable Long id,
            @RequestParam(required = false) String notes,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.rejectWorker(id, currentUser, notes));
    }

    @DeleteMapping("/admin/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> deleteWorkerAsAdmin(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        workerService.deleteWorker(id, currentUser);
        return ResponseEntity.ok("Worker deleted successfully");
    }

    @GetMapping
    public ResponseEntity<List<WorkerResponseDto>> getAllWorkers() {
        return ResponseEntity.ok(workerService.getAllWorkers());
    }

    @GetMapping("/paged")
    public ResponseEntity<Page<WorkerResponseDto>> getAllWorkersPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(workerService.getAllWorkersPaged(page, size));
    }

    @GetMapping("/available")
    public ResponseEntity<List<WorkerResponseDto>> getAvailableWorkers() {
        return ResponseEntity.ok(workerService.getAvailableWorkers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkerResponseDto> getWorkerById(@PathVariable Long id) {
        return ResponseEntity.ok(workerService.getWorkerById(id));
    }

    @GetMapping("/me")
    public ResponseEntity<WorkerResponseDto> getMyWorkerProfile(@AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.getMyWorkerProfile(currentUser));
    }

    @GetMapping("/{id}/manage")
    public ResponseEntity<WorkerResponseDto> getWorkerForOwnerOrAdmin(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.getWorkerForOwnerOrAdmin(id, currentUser));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkerResponseDto> updateWorker(
            @PathVariable Long id,
            @Valid @RequestBody WorkerRequestDto dto,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.updateWorker(id, dto, currentUser));
    }

    @PatchMapping("/{id}/availability")
    public ResponseEntity<WorkerResponseDto> updateAvailability(
            @PathVariable Long id,
            @RequestParam WorkerAvailability availability,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.updateAvailability(id, availability, currentUser));
    }

    @PostMapping(value = "/{id}/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkerResponseDto> uploadWorkerImage(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.uploadWorkerImage(id, file, currentUser));
    }

    @PostMapping(value = "/{id}/upload-identity-document", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<WorkerResponseDto> uploadIdentityDocument(
            @PathVariable Long id,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(workerService.uploadIdentityDocument(id, file, currentUser));
    }

    @GetMapping("/{id}/identity-document")
    public ResponseEntity<Resource> getIdentityDocument(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        Resource resource = workerService.getIdentityDocumentResource(id, currentUser);
        String contentType = workerService.getIdentityDocumentContentType(id, currentUser);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .contentType(MediaType.parseMediaType(contentType))
                .body(resource);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteWorker(
            @PathVariable Long id,
            @AuthenticationPrincipal User currentUser) {
        workerService.deleteWorker(id, currentUser);
        return ResponseEntity.ok("Worker deleted successfully");
    }

    @GetMapping("/job/{job}")
    public ResponseEntity<List<WorkerResponseDto>> getWorkersByJob(@PathVariable String job) {
        return ResponseEntity.ok(workerService.getWorkersByJob(job));
    }

    @GetMapping("/address/{address}")
    public ResponseEntity<List<WorkerResponseDto>> getWorkersByAddress(@PathVariable String address) {
        return ResponseEntity.ok(workerService.getWorkersByAddress(address));
    }
}

