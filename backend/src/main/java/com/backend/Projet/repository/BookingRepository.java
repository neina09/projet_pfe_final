// BookingRepository.java
package com.backend.Projet.repository;

import com.backend.Projet.model.Booking;
import com.backend.Projet.model.BookingStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    Page<Booking> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    Page<Booking> findByWorkerUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    List<Booking> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    List<Booking> findByWorkerUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    List<Booking> findByStatus(BookingStatus status);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    List<Booking> findByUserIdAndStatus(Long userId, BookingStatus status);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    List<Booking> findByWorkerUserIdAndStatus(Long userId, BookingStatus status);

    @EntityGraph(attributePaths = {"user", "worker", "worker.user"})
    Optional<Booking> findById(Long id);

    long countByStatus(BookingStatus status);

    @Modifying
    void deleteByUserId(Long userId);

    @Modifying
    void deleteByWorkerId(Long workerId);
}
