// TaskRepository.java
package com.backend.Projet.repository;

import com.backend.Projet.model.Task;
import com.backend.Projet.model.TaskStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query(
            value = """
                SELECT t FROM Task t
                JOIN FETCH t.user u
                LEFT JOIN FETCH t.assignedWorker aw
                LEFT JOIN FETCH aw.user
                WHERE u.id = :userId
            """,
            countQuery = """
                SELECT COUNT(t) FROM Task t
                WHERE t.user.id = :userId
            """
    )
    Page<Task> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query(
            value = """
                SELECT t FROM Task t
                JOIN FETCH t.user u
                LEFT JOIN FETCH t.assignedWorker aw
                LEFT JOIN FETCH aw.user
                WHERE u.id = :userId AND t.status = :status
            """,
            countQuery = """
                SELECT COUNT(t) FROM Task t
                WHERE t.user.id = :userId AND t.status = :status
            """
    )
    Page<Task> findByUserIdAndStatus(@Param("userId") Long userId, @Param("status") TaskStatus status, Pageable pageable);

    @Query(
            value = """
                SELECT t FROM Task t
                JOIN FETCH t.user
                LEFT JOIN FETCH t.assignedWorker aw
                LEFT JOIN FETCH aw.user
                WHERE t.status = :status
            """,
            countQuery = """
                SELECT COUNT(t) FROM Task t
                WHERE t.status = :status
            """
    )
    Page<Task> findByStatus(@Param("status") TaskStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "assignedWorker", "assignedWorker.user"})
    List<Task> findByUserId(Long userId);

    @EntityGraph(attributePaths = {"user", "assignedWorker", "assignedWorker.user"})
    List<Task> findByAssignedWorkerId(Long workerId);

    @EntityGraph(attributePaths = {"user", "assignedWorker", "assignedWorker.user"})
    Optional<Task> findById(Long id);

    long countByStatus(TaskStatus status);

    @EntityGraph(attributePaths = {"user", "assignedWorker", "assignedWorker.user"})
    List<Task> findTop5ByStatusOrderByIdDesc(TaskStatus status);

    @Query("""
        SELECT t FROM Task t
        JOIN FETCH t.user
        LEFT JOIN FETCH t.assignedWorker aw
        LEFT JOIN FETCH aw.user
        WHERE t.status = :status
        AND (:address IS NULL
             OR LOWER(t.address) LIKE LOWER(CONCAT('%',:address,'%')))
        AND (:profession IS NULL
             OR LOWER(COALESCE(t.profession, '')) LIKE LOWER(CONCAT('%',:profession,'%')))
        AND (:keyword IS NULL
             OR LOWER(t.title) LIKE LOWER(CONCAT('%',:keyword,'%'))
             OR LOWER(t.description) LIKE LOWER(CONCAT('%',:keyword,'%'))
             OR LOWER(t.address) LIKE LOWER(CONCAT('%',:keyword,'%'))
             OR LOWER(COALESCE(t.profession, '')) LIKE LOWER(CONCAT('%',:keyword,'%')))
        ORDER BY t.createdAt DESC
    """)
    @EntityGraph(attributePaths = {"user", "assignedWorker", "assignedWorker.user"})
    Page<Task> searchOpenTasks(
            @Param("status")  TaskStatus status,
            @Param("address") String address,
            @Param("profession") String profession,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Modifying
    @Query("UPDATE Task t SET t.assignedWorker = NULL WHERE t.assignedWorker.id = :workerId")
    void clearAssignedWorkerByWorkerId(@Param("workerId") Long workerId);

    @Modifying
    void deleteByUserId(Long userId);
}
