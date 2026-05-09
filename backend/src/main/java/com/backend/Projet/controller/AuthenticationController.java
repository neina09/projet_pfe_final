package com.backend.Projet.controller;

import com.backend.Projet.dto.*;
import com.backend.Projet.exception.BusinessException;
import com.backend.Projet.model.User;
import com.backend.Projet.service.AuthRateLimitService;
import com.backend.Projet.service.AuthenticationService;
import com.backend.Projet.service.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RequestMapping("/auth")
@RestController
public class AuthenticationController {

    private final JwtService jwtService;
    private final AuthenticationService authenticationService;
    private final AuthRateLimitService authRateLimitService;

    @Value("${app.security.rate-limit.login.max-attempts:5}")
    private int loginMaxAttempts;

    @Value("${app.security.rate-limit.login.window-minutes:15}")
    private long loginWindowMinutes;

    @Value("${app.security.rate-limit.verification.max-attempts:5}")
    private int verificationMaxAttempts;

    @Value("${app.security.rate-limit.verification.window-minutes:15}")
    private long verificationWindowMinutes;

    @Value("${app.security.rate-limit.password-reset.max-attempts:3}")
    private int passwordResetMaxAttempts;

    @Value("${app.security.rate-limit.password-reset.window-minutes:15}")
    private long passwordResetWindowMinutes;

    public AuthenticationController(
            JwtService jwtService,
            AuthenticationService authenticationService,
            AuthRateLimitService authRateLimitService
    ) {
        this.jwtService = jwtService;
        this.authenticationService = authenticationService;
        this.authRateLimitService = authRateLimitService;
    }

    @PostMapping("/signup")
    public ResponseEntity<UserResponseDto> register(@Valid @RequestBody RegisterUserDto registerUserDto) {
        UserResponseDto registeredUser = authenticationService.signup(registerUserDto);
        return ResponseEntity.ok(registeredUser);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> authenticate(
            @Valid @RequestBody LoginUserDto loginUserDto,
            HttpServletRequest request
    ) {
        String remoteAddress = extractClientIp(request);
        String normalizedIdentifier = normalizeIdentifier(loginUserDto.getPhone());
        Duration window = Duration.ofMinutes(loginWindowMinutes);
        String message = "Too many login attempts. Please try again later.";

        authRateLimitService.assertWithinRateLimit(
                "login:ip:" + remoteAddress,
                loginMaxAttempts,
                window,
                message
        );

        if (!normalizedIdentifier.isBlank() && !"unknown".equalsIgnoreCase(normalizedIdentifier)) {
            authRateLimitService.assertWithinRateLimit(
                    "login:identifier:" + normalizedIdentifier,
                    loginMaxAttempts,
                    window,
                    message
            );
        }

        User authenticatedUser;
        try {
            authenticatedUser = authenticationService.authenticate(loginUserDto);
        } catch (BadCredentialsException | BusinessException ex) {
            authRateLimitService.registerAttempt("login:ip:" + remoteAddress, window);
            if (!normalizedIdentifier.isBlank() && !"unknown".equalsIgnoreCase(normalizedIdentifier)) {
                authRateLimitService.registerAttempt("login:identifier:" + normalizedIdentifier, window);
            }
            throw ex;
        }

        authRateLimitService.reset("login:ip:" + remoteAddress);
        if (!normalizedIdentifier.isBlank() && !"unknown".equalsIgnoreCase(normalizedIdentifier)) {
            authRateLimitService.reset("login:identifier:" + normalizedIdentifier);
        }

        String jwtToken = jwtService.generateToken(authenticatedUser);
        LoginResponseDto loginResponse = new LoginResponseDto(jwtToken, jwtService.getExpirationTime());
        return ResponseEntity.ok(loginResponse);
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyUser(
            @Valid @RequestBody VerifyUserDto verifyUserDto,
            HttpServletRequest request
    ) {
        enforceRateLimit(
                "verify",
                request,
                verifyUserDto.getPhone(),
                verificationMaxAttempts,
                verificationWindowMinutes,
                "Too many verification attempts. Please try again later."
        );
        authenticationService.verifyUser(verifyUserDto);
        return ResponseEntity.ok("Account verified successfully");
    }

    @PostMapping("/resend")
    public ResponseEntity<?> resendVerificationCode(
            @RequestParam String phone,
            HttpServletRequest request
    ) {
        enforceRateLimit(
                "resend",
                request,
                phone,
                verificationMaxAttempts,
                verificationWindowMinutes,
                "Too many resend attempts. Please try again later."
        );
        authenticationService.resendVerificationCode(phone);
        return ResponseEntity.ok("Verification code sent");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordDto input,
            HttpServletRequest request
    ) {
        enforceRateLimit(
                "forgot-password",
                request,
                input.getPhone(),
                passwordResetMaxAttempts,
                passwordResetWindowMinutes,
                "Too many password reset requests. Please try again later."
        );
        authenticationService.forgotPassword(input.getPhone());
        return ResponseEntity.ok("Reset code sent");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordDto input,
            HttpServletRequest request
    ) {
        enforceRateLimit(
                "reset-password",
                request,
                input.getToken(),
                passwordResetMaxAttempts,
                passwordResetWindowMinutes,
                "Too many password reset attempts. Please try again later."
        );
        authenticationService.resetPassword(input);
        return ResponseEntity.ok("Password reset successfully");
    }

    private void enforceRateLimit(
            String action,
            HttpServletRequest request,
            String identifier,
            int maxAttempts,
            long windowMinutes,
            String message
    ) {
        String remoteAddress = extractClientIp(request);
        String normalizedIdentifier = identifier == null ? "unknown" : identifier.trim();
        Duration window = Duration.ofMinutes(windowMinutes);

        authRateLimitService.checkRateLimit(action + ":ip:" + remoteAddress, maxAttempts, window, message);

        if (!normalizedIdentifier.isBlank() && !"unknown".equalsIgnoreCase(normalizedIdentifier)) {
            authRateLimitService.checkRateLimit(action + ":identifier:" + normalizedIdentifier, maxAttempts, window, message);
        }
    }

    private String normalizeIdentifier(String identifier) {
        return identifier == null ? "unknown" : identifier.trim();
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }

        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }

        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }
}
