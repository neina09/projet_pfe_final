// OfferRepository.java
package com.backend.Projet.repository;

import com.backend.Projet.model.Offer;
import com.backend.Projet.model.OfferStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface OfferRepository extends JpaRepository<Offer, Long> {
    @EntityGraph(attributePaths = {"task", "task.user", "worker", "worker.user"})
    List<Offer>  findByTaskId(Long taskId);

    @EntityGraph(attributePaths = {"task", "task.user", "worker", "worker.user"})
    Page<Offer>  findByTaskId(Long taskId, Pageable pageable);

    @EntityGraph(attributePaths = {"task", "task.user", "worker", "worker.user"})
    List<Offer>  findByWorkerUserId(Long userId);

    @EntityGraph(attributePaths = {"task", "task.user", "worker", "worker.user"})
    List<Offer>  findByTaskIdAndStatus(Long taskId, OfferStatus status);

    @EntityGraph(attributePaths = {"task", "task.user", "worker", "worker.user"})
    Optional<Offer> findById(Long id);

    boolean      existsByTaskIdAndWorkerId(Long taskId, Long workerId);

    @Modifying
    void deleteByTaskId(Long taskId);

    @Modifying
    void deleteByTaskUserId(Long userId);

    @Modifying
    void deleteByWorkerId(Long workerId);
}
