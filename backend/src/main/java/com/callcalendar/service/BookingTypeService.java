package com.callcalendar.service;

import com.callcalendar.domain.BookingType;
import com.callcalendar.repo.BookingTypeRepository;
import jakarta.inject.Singleton;
import java.util.List;

/**
 * Catalog of booking types (Issue #28). Encapsulates the "active" check used by both the booking
 * and slot flows so a hidden type can't be silently booked against.
 */
@Singleton
public class BookingTypeService {

  private final BookingTypeRepository repository;

  public BookingTypeService(BookingTypeRepository repository) {
    this.repository = repository;
  }

  public List<BookingType> listAll() {
    return repository.findAll();
  }

  public List<BookingType> listActive() {
    return repository.findActive();
  }

  /** Loads a type by id; refuses hidden ones so a stale id never sneaks through. */
  public BookingType requireActive(long id) {
    BookingType type =
        repository
            .findById(id)
            .orElseThrow(() -> new BookingTypeNotFoundException("no booking type with id " + id));
    if (!type.active()) {
      throw new InvalidRequestException("booking type is not active");
    }
    return type;
  }

  public BookingType create(String title, String description, int durationMinutes) {
    return repository.insert(title, description, durationMinutes);
  }

  public BookingType update(
      long id, String title, String description, int durationMinutes, int sortOrder, boolean active) {
    return repository
        .update(id, title, description, durationMinutes, sortOrder, active)
        .orElseThrow(() -> new BookingTypeNotFoundException("no booking type with id " + id));
  }

  public boolean delete(long id) {
    return repository.deleteById(id);
  }
}
