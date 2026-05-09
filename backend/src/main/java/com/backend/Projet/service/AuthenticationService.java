package com.backend.Projet.service;

import com.backend.Projet.dto.ChangePasswordDto;
import com.backend.Projet.dto.LoginUserDto;
import com.backend.Projet.dto.RegisterUserDto;
import com.backend.Projet.dto.ResetPasswordDto;
import com.backend.Projet.dto.UpdateProfileDto;
import com.backend.Projet.dto.UserResponseDto;
import com.backend.Projet.dto.VerifyUserDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.exception.ResourceNotFoundException;
import com.backend.Projet.model.Role;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.NotificationRepository;
import com.backend.Projet.repository.OfferRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import com.backend.Projet.util.MauritaniaPhoneUtils;
import com.backend.Projet.util.PasswordPolicy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.Optional;

@Service
public class AuthenticationService {
    private static final Logger log = LoggerFactory.getLogger(AuthenticationService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int VERIFICATION_CODE_LENGTH = 6;
    private static final int RESET_TOKEN_LENGTH = 6;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final com.backend.Projet.mapper.UserMapper userMapper;
    private final SmsService smsService;
    private final WorkerRepository workerRepository;
    private final OfferRepository offerRepository;
    private final BookingRepository bookingRepository;
    private final RatingRepository ratingRepository;
    private final TaskRepository taskRepository;
    private final NotificationRepository notificationRepository;
    private final FileStorageService fileStorageService;

    public AuthenticationService(
            UserRepository userRepository,
            AuthenticationManager authenticationManager,
            PasswordEncoder passwordEncoder,
            com.backend.Projet.mapper.UserMapper userMapper,
            SmsService smsService,
            WorkerRepository workerRepository,
            OfferRepository offerRepository,
            BookingRepository bookingRepository,
            RatingRepository ratingRepository,
            TaskRepository taskRepository,
            NotificationRepository notificationRepository,
            FileStorageService fileStorageService
    ) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.userMapper = userMapper;
        this.smsService = smsService;
        this.workerRepository = workerRepository;
        this.offerRepository = offerRepository;
        this.bookingRepository = bookingRepository;
        this.ratingRepository = ratingRepository;
        this.taskRepository = taskRepository;
        this.notificationRepository = notificationRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public UserResponseDto signup(RegisterUserDto input) {
        String normalizedPhone = MauritaniaPhoneUtils.normalize(input.getPhone());
        PasswordPolicy.validateOrThrow(input.getPassword());
        Optional<User> existingUser = userRepository.findByPhone(normalizedPhone);
        if (existingUser.isPresent()) {
            if (existingUser.get().isEnabled()) {
                log.warn("Phone already in use for {}", maskPhone(normalizedPhone));
                throw new BusinessException("Phone already in use");
            }
            // User exists but is not enabled, update them and send a new code
            User user = existingUser.get();
            user.setUsername(input.getUsername());
            user.setPassword(passwordEncoder.encode(input.getPassword()));
            String verificationCode = generateVerificationCode();
            user.setVerificationCode(passwordEncoder.encode(verificationCode));
            user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
            sendVerificationCode(user, verificationCode);
            User saved = userRepository.save(user);
            return userMapper.toDto(saved);
        }
        User user = new User(input.getUsername(), normalizedPhone, passwordEncoder.encode(input.getPassword()));
        user.setRole(Role.USER);
        String verificationCode = generateVerificationCode();
        user.setVerificationCode(passwordEncoder.encode(verificationCode));
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(15));
        user.setEnabled(false);
        sendVerificationCode(user, verificationCode);
        log.info("Verification SMS dispatched to {}", maskPhone(normalizedPhone));
        User saved = userRepository.save(user);
        return userMapper.toDto(saved);
    }

    public User authenticate(LoginUserDto input) {
        String normalizedPhone = MauritaniaPhoneUtils.normalize(input.getPhone());
        User user = userRepository.findByPhone(normalizedPhone)
                .orElseThrow(() -> new BadCredentialsException("Invalid phone or password"));
        if (!user.isEnabled()) {
            throw new BusinessException("Account not verified. Please verify your account.");
        }
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(normalizedPhone, input.getPassword())
        );
        return user;
    }

    @Transactional
    public void verifyUser(VerifyUserDto input) {
        String normalizedPhone = MauritaniaPhoneUtils.normalize(input.getPhone());
        User user = userRepository.findByPhone(normalizedPhone)
                .orElseThrow(() -> new BusinessException("Invalid verification code or phone"));

        if (user.getVerificationCode() == null || user.getVerificationCodeExpiresAt() == null) {
            throw new BusinessException("No verification code found for this account");
        }
        if (user.getVerificationCodeExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException("Verification code has expired");
        }
        if (passwordEncoder.matches(input.getVerificationCode(), user.getVerificationCode())) {
            user.setEnabled(true);
            user.setVerificationCode(null);
            user.setVerificationCodeExpiresAt(null);
            userRepository.save(user);
        } else {
            throw new BusinessException("Invalid verification code");
        }
    }

    @Transactional
    public void resendVerificationCode(String phone) {
        String normalizedPhone = MauritaniaPhoneUtils.normalize(phone);
        Optional<User> optionalUser = userRepository.findByPhone(normalizedPhone);
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            if (user.isEnabled()) {
                throw new BusinessException("Account is already verified");
            }
            String verificationCode = generateVerificationCode();
            user.setVerificationCode(passwordEncoder.encode(verificationCode));
            user.setVerificationCodeExpiresAt(LocalDateTime.now().plusHours(1));
            sendVerificationCode(user, verificationCode);
            userRepository.save(user);
        } else {
            log.info("Verification code requested for unknown phone {}", maskPhone(normalizedPhone));
        }
    }

    @Transactional
    public void forgotPassword(String phone) {
        String normalizedPhone = MauritaniaPhoneUtils.normalize(phone);
        Optional<User> optionalUser = userRepository.findByPhone(normalizedPhone);
        if (optionalUser.isEmpty()) {
            log.info("Reset password requested for unknown phone {}", maskPhone(normalizedPhone));
            return;
        }
        User user = optionalUser.get();
        String token = generateResetPasswordToken();
        user.setResetPasswordToken(passwordEncoder.encode(token));
        user.setResetPasswordExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        smsService.sendPasswordResetToken(user.getPhone(), token);
    }

    @Transactional
    public void resetPassword(ResetPasswordDto input) {
        PasswordPolicy.validateOrThrow(input.getNewPassword());
        LocalDateTime now = LocalDateTime.now();
        User user = userRepository.findByResetPasswordExpiresAtAfter(now).stream()
                .filter(candidate -> candidate.getResetPasswordToken() != null)
                .filter(candidate -> passwordEncoder.matches(input.getToken(), candidate.getResetPasswordToken()))
                .min(Comparator.comparing(User::getResetPasswordExpiresAt))
                .orElseThrow(() -> new ResourceNotFoundException("Invalid or expired reset token"));
        user.setPassword(passwordEncoder.encode(input.getNewPassword()));
        user.setResetPasswordToken(null);
        user.setResetPasswordExpiresAt(null);
        userRepository.save(user);
    }

    @Transactional
    public void changePassword(User currentUser, ChangePasswordDto input) {
        if (!passwordEncoder.matches(input.getCurrentPassword(), currentUser.getPassword())) {
            throw new BusinessException("Current password is incorrect");
        }
        PasswordPolicy.validateOrThrow(input.getNewPassword());
        currentUser.setPassword(passwordEncoder.encode(input.getNewPassword()));
        userRepository.save(currentUser);
    }

    @Transactional
    public UserResponseDto updateProfile(User currentUser, UpdateProfileDto input) {
        if (input.getUsername() != null && !input.getUsername().isBlank()) {
            currentUser.setUsername(input.getUsername());
        }
        if (input.getPhone() != null && !input.getPhone().isBlank()) {
            String normalizedPhone = MauritaniaPhoneUtils.normalize(input.getPhone());
            Optional<User> existingUser = userRepository.findByPhone(normalizedPhone);
            if (existingUser.isPresent() && !existingUser.get().getId().equals(currentUser.getId())) {
                throw new BusinessException("Phone already in use");
            }
            currentUser.setPhone(normalizedPhone);
        }
        User saved = userRepository.save(currentUser);
        return userMapper.toDto(saved);
    }

    @Transactional
    public UserResponseDto uploadProfileImage(User currentUser, MultipartFile file) {
        String previousImageUrl = currentUser.getImageUrl();
        currentUser.setImageUrl(fileStorageService.storeUserImage(file));
        User saved = userRepository.save(currentUser);
        workerRepository.findByUserId(saved.getId()).ifPresent(worker -> {
            if (worker.getImageUrl() == null || worker.getImageUrl().isBlank()) {
                worker.setImageUrl(saved.getImageUrl());
                workerRepository.save(worker);
            }
        });
        if (previousImageUrl != null && !previousImageUrl.isBlank() && !previousImageUrl.equals(saved.getImageUrl())) {
            fileStorageService.deleteStoredFile(previousImageUrl);
        }
        return userMapper.toDto(saved);
    }

    @Transactional
    public void deleteAccount(User currentUser) {
        User managedUser = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Long userId = managedUser.getId();
        log.info("Starting account deletion for user ID: {}", userId);

        notificationRepository.deleteByUserId(userId);

        Worker worker = workerRepository.findByUserId(userId).orElse(null);
        if (worker != null) {
            Long workerId = worker.getId();
            log.info("User is a worker (ID: {}). Cleaning up worker data.", workerId);
            ratingRepository.deleteByTaskAssignedWorkerId(workerId);
            taskRepository.clearAssignedWorkerByWorkerId(workerId);
            ratingRepository.deleteByBookingWorkerId(workerId);
            ratingRepository.deleteByWorkerId(workerId);
            offerRepository.deleteByWorkerId(workerId);
            bookingRepository.deleteByWorkerId(workerId);
            fileStorageService.deleteStoredFile(worker.getImageUrl());
            fileStorageService.deleteStoredFile(worker.getIdentityDocumentUrl());
            workerRepository.delete(worker);
        }

        ratingRepository.deleteByBookingUserId(userId);
        ratingRepository.deleteByUserId(userId);
        offerRepository.deleteByTaskUserId(userId);
        bookingRepository.deleteByUserId(userId);
        taskRepository.deleteByUserId(userId);

        fileStorageService.deleteStoredFile(managedUser.getImageUrl());
        userRepository.delete(managedUser);
        log.info("Successfully deleted user ID: {}", userId);
    }

    private void sendVerificationCode(User user, String verificationCode) {
        smsService.sendVerificationCode(user.getPhone(), verificationCode);
    }

    private String generateVerificationCode() {
        int lowerBound = (int) Math.pow(10, VERIFICATION_CODE_LENGTH - 1);
        int range = (int) Math.pow(10, VERIFICATION_CODE_LENGTH) - lowerBound;
        return String.valueOf(lowerBound + SECURE_RANDOM.nextInt(range));
    }

    private String generateResetPasswordToken() {
        int lowerBound = (int) Math.pow(10, RESET_TOKEN_LENGTH - 1);
        int range = (int) Math.pow(10, RESET_TOKEN_LENGTH) - lowerBound;
        return String.valueOf(lowerBound + SECURE_RANDOM.nextInt(range));
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "unknown";
        }
        if (phone.length() <= 4) {
            return "****";
        }
        return "*".repeat(Math.max(0, phone.length() - 4)) + phone.substring(phone.length() - 4);
    }
}
