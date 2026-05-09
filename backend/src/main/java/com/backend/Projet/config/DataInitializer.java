package com.backend.Projet.config;

import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed-admin:false}")
    private boolean seedAdmin;

    @Value("${app.seed-admin-phone:}")
    private String adminPhone;

    @Value("${app.seed-admin-username:}")
    private String adminUsername;

    @Value("${app.seed-admin-password:}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        if (!seedAdmin) {
            return;
        }
        if (adminPhone == null || adminPhone.isBlank()
                || adminUsername == null || adminUsername.isBlank()
                || adminPassword == null || adminPassword.isBlank()) {
            throw new IllegalStateException("Seed admin is enabled but admin credentials are not fully configured");
        }

        if (userRepository.findByPhone(adminPhone).isPresent()) {
            return;
        }

        User admin = new User();
        admin.setUsername(adminUsername);
        admin.setPhone(adminPhone);
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);

        userRepository.save(admin);
    }
}
