import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service(#{ title: "call-calendar" })
@info(#{ version: "0.1" })
@doc("Booking calendar API: hosts publish availability, guests book call slots.")
@server("/", "Default server")
@tagMetadata(#[
  #{ name: "ping", description: "Connectivity check" },
  #{ name: "slots", description: "Browsing available slots" },
  #{ name: "booking", description: "Booking and cancelling slots" },
  #{ name: "booking-types", description: "Host-defined booking types the guest picks" },
  #{ name: "host-bookings", description: "Host-only booking operations" },
  #{ name: "host-settings", description: "Public host settings" },
])
namespace CallCalendar;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

@doc("Payload returned to guests (UC-3, UC-4) — exposes the secret cancellation token.")
model BookingResponse {
  guestName: string;
  guestEmail: string;
  start: string;
  end: string;
  state: string;
  bookingTypeId: int64;
  cancellationToken: string;
}

@doc("Public payload for a booking type — used by both the guest list and host CRUD responses.")
model BookingTypeResponse {
  id: int64;
  title: string;
  description: string;
  durationMinutes: int32;
  sortOrder: int32;
  active: boolean;
}

@doc("Body of POST /api/bookings. The guest picks a booking type and the server derives `durationMinutes` from it (GLOSSARY.md: \"Booking type\"). Fields are nullable because input is untrusted.")
model CreateBookingRequest {
  start: string;
  bookingTypeId?: int64 | null;
  guestName: string;
  guestEmail: string;
}

@doc("Body of POST /api/host/booking-types. Fields are nullable because input is untrusted.")
model CreateBookingTypeRequest {
  title: string;
  description: string;
  durationMinutes: int32;
}

@doc("Bookings payload the host page needs. Mirrors BookingResponse minus the secret cancellation token: the token is meant to be per-guest (docs/domain.md), and listing every guest's token in one unauthenticated response would contradict that. The id is included so the host view can drive host-side cancellation by id (UC-6). `bookingTypeId` lets the host page render the booking type of each row (which one the guest chose).")
model HostBookingResponse {
  id: int64;
  guestName: string;
  guestEmail: string;
  start: string;
  end: string;
  state: string;
  bookingTypeId: int64;
}

@doc("Public host settings the guest UI needs: timezone and the number of calendar days a guest can book ahead. Allowed durations now live in booking_type.")
model HostSettingsResponse {
  timezone: string;
  bookingHorizonDays: int32;
}

@doc("RFC 7807 problem detail; served as application/problem+json.")
model ProblemDetail {
  type: string;
  title: string;
  status: int32;
  detail: string;
}

@doc("Body of PUT /api/host/booking-types/{id}. `sortOrder` and `active` are host-only bookkeeping fields, so the host can move the type to the top of the picker or hide it without creating / deleting.")
model UpdateBookingTypeRequest {
  title: string;
  description: string;
  durationMinutes: int32;
  sortOrder: int32;
  active: boolean;
}

// ---------------------------------------------------------------------------
// Common response types
// ---------------------------------------------------------------------------

@doc("Malformed body, missing bookingTypeId, or inactive booking type")
model BookingBadRequest {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("Slot no longer available (taken, past, too soon, or outside availability)")
model BookingConflict {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("No booking for this token")
model BookingNotFound {
  @statusCode statusCode: 404;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("The booking has started and can no longer be cancelled")
model CancelConflict {
  @statusCode statusCode: 409;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("Malformed date or unknown / inactive bookingTypeId")
model SlotsBadRequest {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("Missing or invalid fields (blank title, duration outside 5-240 minutes)")
model BookingTypeBadRequest {
  @statusCode statusCode: 400;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("No booking type with this id")
model BookingTypeNotFound {
  @statusCode statusCode: 404;
  @header contentType: "application/problem+json";
  @body body: ProblemDetail;
}

@doc("Type deleted")
model TypeDeleted {
  @statusCode statusCode: 204;
}

// ---------------------------------------------------------------------------
// Success response types
// ---------------------------------------------------------------------------

@doc("ping 200 response")
model PingResponse {
  @statusCode statusCode: 200;
  @header contentType: "text/plain";
  @body body: string;
}

@doc("Slot start times as UTC instants")
model GetSlotsResponse {
  @statusCode statusCode: 200;
  @body body: string[];
}

@doc("Bookings with end_at > now, both states, sorted by start_at ascending. The host UI splits the response into a 'Happening now' section (start <= now < end) and the upcoming list (start > now).")
model ListBookingsResponse {
  @statusCode statusCode: 200;
  @body body: HostBookingResponse[];
}

@doc("Booking created; cancellationToken unlocks UC-4")
model CreateBookingResponse {
  @statusCode statusCode: 201;
  @body body: BookingResponse;
}

@doc("The booking")
model GetBookingResponse {
  @statusCode statusCode: 200;
  @body body: BookingResponse;
}

@doc("The booking, now cancelled; the slot is free again")
model CancelBookingResponse {
  @statusCode statusCode: 200;
  @body body: BookingResponse;
}

@doc("Host settings")
model GetHostSettingsResponse {
  @statusCode statusCode: 200;
  @body body: HostSettingsResponse;
}

@doc("Active types, sorted for the picker (lowest sort_order first)")
model ListActiveBookingTypesResponse {
  @statusCode statusCode: 200;
  @body body: BookingTypeResponse[];
}

@doc("Every row, ordered for the host settings page")
model ListAllBookingTypesResponse {
  @statusCode statusCode: 200;
  @body body: BookingTypeResponse[];
}

@doc("The new type, with database-assigned id and sort_order")
model CreateBookingTypeResponse {
  @statusCode statusCode: 201;
  @body body: BookingTypeResponse;
}

@doc("The updated type")
model UpdateBookingTypeResponse {
  @statusCode statusCode: 200;
  @body body: BookingTypeResponse;
}

@doc("The booking, now cancelled; the slot is free again")
model CancelBookingByIdResponse {
  @statusCode statusCode: 200;
  @body body: HostBookingResponse;
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

@tag("ping")
@route("/api")
interface Ping {
  @summary("Connectivity check used to prove frontend/backend wiring")
  @operationId("ping")
  @get
  @route("/ping")
  ping(): PingResponse;
}

@tag("slots")
@route("/api/slots")
interface Slots {
  @summary("Available slot start times for a host-local day, filtered by booking type")
  @operationId("getSlots")
  @get
  getSlots(
    @query date: string,
    @query bookingTypeId: int64,
  ): GetSlotsResponse | SlotsBadRequest;
}

@tag("booking")
@route("/api/bookings")
interface Booking {
  @summary("List upcoming bookings")
  @operationId("listBookings")
  @get
  listBookings(): ListBookingsResponse;

  @summary("Book an available slot")
  @operationId("createBooking")
  @post
  createBooking(
    @body body: CreateBookingRequest,
  ): CreateBookingResponse | BookingBadRequest | BookingConflict;

  @summary("Booking details by secret cancellation token")
  @operationId("getBooking")
  @get
  @route("/{token}")
  getBooking(
    @path token: string,
  ): GetBookingResponse | BookingNotFound;

  @summary("Cancel a booking via its secret token")
  @operationId("cancelBooking")
  @post
  @route("/{token}/cancel")
  cancelBooking(
    @path token: string,
  ): CancelBookingResponse | BookingNotFound | CancelConflict;
}

@tag("booking-types")
@route("/api")
interface BookingTypes {
  @summary("Active booking types for the guest picker")
  @operationId("listActiveBookingTypes")
  @get
  @route("/booking-types")
  listActiveBookingTypes(): ListActiveBookingTypesResponse;

  @summary("All booking types (host view), including inactive and drafts")
  @operationId("listAllBookingTypes")
  @get
  @route("/host/booking-types")
  listAllBookingTypes(): ListAllBookingTypesResponse;

  @summary("Create a booking type")
  @operationId("createBookingType")
  @post
  @route("/host/booking-types")
  createBookingType(
    @body body: CreateBookingTypeRequest,
  ): CreateBookingTypeResponse | BookingTypeBadRequest;

  @summary("Update a booking type")
  @operationId("updateBookingType")
  @put
  @route("/host/booking-types/{id}")
  updateBookingType(
    @path id: int64,
    @body body: UpdateBookingTypeRequest,
  ): UpdateBookingTypeResponse | BookingTypeBadRequest | BookingTypeNotFound;

  @summary("Delete a booking type")
  @operationId("deleteBookingType")
  @delete
  @route("/host/booking-types/{id}")
  deleteBookingType(
    @path id: int64,
  ): TypeDeleted | BookingTypeNotFound;
}

@tag("host-bookings")
@route("/api/host/bookings")
interface HostBookings {
  @summary("Cancel a booking by its numeric id (host view)")
  @operationId("cancelBookingById")
  @post
  @route("/{id}/cancel")
  cancelBookingById(
    @path id: int64,
  ): CancelBookingByIdResponse | BookingNotFound | CancelConflict;
}

@tag("host-settings")
@route("/api/host-settings")
interface HostSettings {
  @summary("Public host settings: timezone and booking horizon")
  @operationId("getHostSettings")
  @get
  getHostSettings(): GetHostSettingsResponse;
}
