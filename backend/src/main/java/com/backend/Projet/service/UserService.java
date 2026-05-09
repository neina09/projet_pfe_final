package com.backend.Projet.service;

import com.backend.Projet.dto.UserResponseDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
    private final WorkerRepository workerRepository;

    public List<UserResponseDto> allUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> UserResponseDto.builder()
                        .id(user.getId())
                        .username(user.getName())
                        .phone(user.getPhone())
                        .role(user.getRole() == null ? null : user.getRole().name())
                        .imageUrl(user.getImageUrl())
                        .build())
                .toList();
    }

    @Transactional
    public UserResponseDto promoteToAdmin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (user.getRole() == Role.ADMIN) {
            throw new BusinessException("This user is already an admin");
        }
        if (workerRepository.findByUserId(userId).isPresent() || user.getRole() == Role.WORKER) {
            throw new BusinessException("A worker account cannot be promoted to admin");
        }

        user.setRole(Role.ADMIN);
        return UserResponseDto.builder()
                .id(user.getId())
                .username(user.getName())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .imageUrl(user.getImageUrl())
                .build();
    }
}
