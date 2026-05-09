package com.backend.Projet.service;

import com.backend.Projet.dto.LoginUserDto;
import com.backend.Projet.dto.RegisterUserDto;
import com.backend.Projet.dto.ResetPasswordDto;
import com.backend.Projet.dto.UserResponseDto;
import com.backend.Projet.dto.VerifyUserDto;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.mapper.UserMapper;
import com.backend.Projet.model.User;
import com.backend.Projet.model.Worker;
import com.backend.Projet.repository.BookingRepository;
import com.backend.Projet.repository.NotificationRepository;
import com.backend.Projet.repository.OfferRepository;
import com.backend.Projet.repository.RatingRepository;
import com.backend.Projet.repository.TaskRepository;
import com.backend.Projet.repository.UserRepository;
import com.backend.Projet.repository.WorkerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SmsService smsService;

    @Mock
    private WorkerRepository workerRepository;

    @Mock
    private OfferRepository offerRepository;

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RatingRepository ratingRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private FileStorageService fileStorageService;

    private AuthenticationService authenticationService;

    @BeforeEach
    void setUp() {
        authenticationService = new AuthenticationService(
                userRepository,
                authenticationManager,
                passwordEncoder,
                new UserMapper(),
                smsService,
                workerRepository,
                offerRepository,
                bookingRepository,
                ratingRepository,
                taskRepository,
                notificationRepository,
                fileStorageService
        );
    }

    @Test
    void signupShouldCreateDisabledUserUsingPhone() {
        RegisterUserDto dto = new RegisterUserDto();
        dto.setUsername("youssef");
        dto.setPhone("+22222123456");
        dto.setPassword("secret123");

        when(userRepository.findByPhone("22123456")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(dto.getPassword())).thenReturn("hashed-password");
        when(passwordEncoder.encode(argThat(value -> value != null && value.toString().matches("\\d{6}")))).thenReturn("hashed-verification");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        UserResponseDto response = authenticationService.signup(dto);

        assertEquals("22123456", response.getPhone());
        assertEquals("youssef", response.getUsername());
        assertEquals("USER", response.getRole());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User savedUser = captor.getValue();
        assertEquals("22123456", savedUser.getPhone());
        assertFalse(savedUser.isEnabled());
        assertEquals("hashed-verification", savedUser.getVerificationCode());
        assertNotNull(savedUser.getVerificationCodeExpiresAt());
        verify(smsService).sendVerificationCode(eq("22123456"), anyString());
    }

    @Test
    void authenticateShouldUsePhoneCredentials() {
        LoginUserDto dto = new LoginUserDto();
        dto.setPhone("+22222123456");
        dto.setPassword("secret123");

        User user = new User();
        user.setId(1L);
        user.setPhone("22123456");
        user.setPassword("hashed");
        user.setEnabled(true);

        when(userRepository.findByPhone("22123456")).thenReturn(Optional.of(user));

        User authenticated = authenticationService.authenticate(dto);

        assertSame(user, authenticated);
        verify(authenticationManager).authenticate(
                new UsernamePasswordAuthenticationToken("22123456", "secret123")
        );
    }

    @Test
    void verifyUserShouldEnableAccountAndClearVerificationData() {
        VerifyUserDto dto = new VerifyUserDto();
        dto.setPhone("22123456");
        dto.setVerificationCode("12345678");

        User user = new User();
        user.setPhone("22123456");
        user.setVerificationCode("hashed-code");
        user.setVerificationCodeExpiresAt(LocalDateTime.now().plusMinutes(5));
        user.setEnabled(false);

        when(userRepository.findByPhone(dto.getPhone())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("12345678", "hashed-code")).thenReturn(true);

        authenticationService.verifyUser(dto);

        assertTrue(user.isEnabled());
        assertNull(user.getVerificationCode());
        assertNull(user.getVerificationCodeExpiresAt());
        verify(userRepository).save(user);
    }

    @Test
    void forgotPasswordShouldIgnoreUnknownPhone() {
        when(userRepository.findByPhone("22111111")).thenReturn(Optional.empty());

        assertDoesNotThrow(() -> authenticationService.forgotPassword("22111111"));
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void resetPasswordShouldRejectExpiredToken() {
        ResetPasswordDto dto = new ResetPasswordDto();
        dto.setToken("expired-token");
        dto.setNewPassword("newsecret1");

        User user = new User();
        user.setResetPasswordToken("hashed-expired-token");
        user.setResetPasswordExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(userRepository.findByResetPasswordExpiresAtAfter(any(LocalDateTime.class))).thenReturn(java.util.List.of());

        com.backend.Projet.exception.ResourceNotFoundException exception = assertThrows(com.backend.Projet.exception.ResourceNotFoundException.class,
                () -> authenticationService.resetPassword(dto));

        assertEquals("Invalid or expired reset token", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void forgotPasswordShouldSendEightDigitResetCodeBySms() {
        User user = new User();
        user.setPhone("22123456");

        when(userRepository.findByPhone("22123456")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode(argThat(value -> value != null && value.toString().matches("\\d{8}")))).thenReturn("hashed-reset-token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authenticationService.forgotPassword("22123456");

        assertEquals("hashed-reset-token", user.getResetPasswordToken());
        verify(smsService).sendPasswordResetToken(eq("22123456"), argThat(token -> token != null && token.matches("\\d{8}")));
    }

    @Test
    void deleteAccountShouldCleanWorkerFilesAndDeleteManagedUser() {
        User currentUser = new User();
        currentUser.setId(7L);

        User managedUser = new User();
        managedUser.setId(7L);
        managedUser.setPhone("22123456");

        Worker worker = new Worker();
        worker.setId(3L);
        worker.setUser(managedUser);
        worker.setImageUrl("/uploads/workers/images/profile.png");
        worker.setIdentityDocumentUrl("/uploads/workers/documents/id.pdf");

        when(userRepository.findById(7L)).thenReturn(Optional.of(managedUser));
        when(workerRepository.findByUserId(7L)).thenReturn(Optional.of(worker));

        authenticationService.deleteAccount(currentUser);

        verify(notificationRepository).deleteByUserId(7L);
        verify(ratingRepository).deleteByTaskAssignedWorkerId(3L);
        verify(taskRepository).clearAssignedWorkerByWorkerId(3L);
        verify(fileStorageService).deleteStoredFile("/uploads/workers/images/profile.png");
        verify(fileStorageService).deleteStoredFile("/uploads/workers/documents/id.pdf");
        verify(workerRepository).delete(worker);
        verify(userRepository).delete(managedUser);
    }

    @Test
    void uploadProfileImageShouldAlsoPopulateWorkerImageWhenMissing() {
        User currentUser = new User();
        currentUser.setId(7L);

        Worker worker = new Worker();
        worker.setId(3L);
        worker.setUser(currentUser);
        worker.setImageUrl(null);

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", "demo".getBytes());

        when(fileStorageService.storeUserImage(file)).thenReturn("/uploads/users/images/avatar.png");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(workerRepository.findByUserId(7L)).thenReturn(Optional.of(worker));
        when(workerRepository.save(any(Worker.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserResponseDto response = authenticationService.uploadProfileImage(currentUser, file);

        assertEquals("/uploads/users/images/avatar.png", response.getImageUrl());
        assertEquals("/uploads/users/images/avatar.png", worker.getImageUrl());
        verify(workerRepository).save(worker);
    }
}
