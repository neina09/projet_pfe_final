// UserRepository — بدّل CrudRepository إلى JpaRepository
package com.backend.Projet.repository;

import com.backend.Projet.model.User;
import com.backend.Projet.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByPhone(String phone);
    Optional<User> findByVerificationCode(String verificationCode);
    Optional<User> findByResetPasswordToken(String token);
    List<User> findByResetPasswordExpiresAtAfter(LocalDateTime cutoff);
    List<User> findByRole(Role role);
    long countByEnabledTrue();
}
