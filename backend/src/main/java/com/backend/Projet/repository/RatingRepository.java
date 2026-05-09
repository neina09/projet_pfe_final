// RatingRepository.java
package com.backend.Projet.repository;

import com.backend.Projet.model.Rating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.*;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {
    @Override
    @EntityGraph(attributePaths = {"booking", "task", "worker", "user"})
    Optional<Rating> findById(Long id);

    @EntityGraph(attributePaths = {"booking", "task", "worker", "user"})
    Optional<Rating> findByBookingId(Long bookingId);

    @EntityGraph(attributePaths = {"booking", "task", "worker", "user"})
    Optional<Rating> findByTaskId(Long taskId);

    boolean existsByBookingId(Long bookingId);

    boolean existsByTaskId(Long taskId);

    @EntityGraph(attributePaths = {"booking", "task", "worker", "user"})
    List<Rating>     findByWorkerId(Long workerId);

    @Query("SELECT AVG(r.stars) FROM Rating r WHERE r.worker.id = :workerId")
    Double calculateAverageRating(Long workerId);

    @Modifying
    void deleteByUserId(Long userId);

    @Modifying
    void deleteByWorkerId(Long workerId);

    @Modifying
    void deleteByBookingUserId(Long userId);

    @Modifying
    void deleteByBookingWorkerId(Long workerId);

    @Modifying
    void deleteByTaskUserId(Long userId);

    @Modifying
    void deleteByTaskId(Long taskId);

    @Modifying
    void deleteByBookingId(Long bookingId);

    @Modifying
    void deleteByTaskAssignedWorkerId(Long workerId);
}
