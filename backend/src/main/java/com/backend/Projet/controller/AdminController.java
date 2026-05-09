package com.backend.Projet.controller;

import com.backend.Projet.dto.AdminDashboardDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AdminDashboardDto> getDashboard(
            @org.springframework.security.core.annotation.AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(adminService.getDashboard(currentUser));
    }
}
