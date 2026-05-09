package com.backend.Projet.controller;

import com.backend.Projet.dto.ChangePasswordDto;
import com.backend.Projet.dto.UpdateProfileDto;
import com.backend.Projet.dto.UserResponseDto;
import com.backend.Projet.model.User;
import com.backend.Projet.service.AuthenticationService;
import com.backend.Projet.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RequestMapping("/users")
@RestController
public class UserController {
    private final UserService userService;
    private final AuthenticationService authenticationService;
    private final com.backend.Projet.mapper.UserMapper userMapper;

    public UserController(UserService userService, AuthenticationService authenticationService, com.backend.Projet.mapper.UserMapper userMapper) {
        this.userService = userService;
        this.authenticationService = authenticationService;
        this.userMapper = userMapper;
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponseDto> authenticatedUser(
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(userMapper.toDto(currentUser));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponseDto>> allUsers() {
        return ResponseEntity.ok(userService.allUsers());
    }

    @PatchMapping("/{id}/promote-admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponseDto> promoteToAdmin(@PathVariable Long id) {
        return ResponseEntity.ok(userService.promoteToAdmin(id));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @Valid @RequestBody ChangePasswordDto input,
            @AuthenticationPrincipal User currentUser) {
        authenticationService.changePassword(currentUser, input);
        return ResponseEntity.ok("Password changed successfully");
    }

    @PutMapping("/update-profile")
    public ResponseEntity<?> updateProfile(
            @Valid @RequestBody UpdateProfileDto input,
            @AuthenticationPrincipal User currentUser) {
        UserResponseDto updatedUser = authenticationService.updateProfile(currentUser, input);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/upload-image")
    public ResponseEntity<UserResponseDto> uploadProfileImage(
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal User currentUser) {
        return ResponseEntity.ok(authenticationService.uploadProfileImage(currentUser, file));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal User currentUser) {
        authenticationService.deleteAccount(currentUser);
        return ResponseEntity.ok("Account deleted successfully");
    }
}
