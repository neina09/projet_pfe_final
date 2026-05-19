export function normalizeUser(user = {}) {
  return {
    ...user,
    name: user.name || user.fullName || user.username || '',
    fullName: user.fullName || user.name || user.username || '',
    username: user.username || user.name || user.fullName || '',
    profilePictureUrl: user.profilePictureUrl || user.imageUrl || '',
  }
}

export function normalizeWorker(worker = {}) {
  return {
    ...worker,
    name: worker.name || worker.fullName || worker.username || '',
    fullName: worker.fullName || worker.name || worker.username || '',
    profession: worker.profession || worker.job || '',
    job: worker.job || worker.profession || '',
    location: worker.location || worker.address || '',
    city: worker.city || worker.location || worker.address || '',
    address: worker.address || worker.location || '',
    profilePictureUrl: worker.profilePictureUrl || worker.imageUrl || '',
    imageUrl: worker.imageUrl || worker.profilePictureUrl || '',
    phone: worker.phone || worker.phoneNumber || worker.userPhone || '',
    phoneNumber: worker.phoneNumber || worker.phone || worker.userPhone || '',
    rating: worker.rating ?? worker.averageRating ?? null,
    averageRating: worker.averageRating ?? worker.rating ?? null,
    subscriptionRequired: Boolean(worker.subscriptionRequired),
    subscriptionActive: Boolean(worker.subscriptionActive),
    subscriptionPaymentStatus: worker.subscriptionPaymentStatus || null,
    subscriptionEndsAt: worker.subscriptionEndsAt || null,
    availability: worker.availability || (worker.available === false ? 'BUSY' : 'AVAILABLE'),
    available: typeof worker.available === 'boolean'
      ? worker.available
      : (worker.availability ? worker.availability === 'AVAILABLE' : true),
    skills: Array.isArray(worker.skills) ? worker.skills : [],
    portfolioPhotos: Array.isArray(worker.portfolioPhotos) ? worker.portfolioPhotos : [],
    reviews: Array.isArray(worker.reviews) ? worker.reviews : [],
  }
}

export function normalizeTask(task = {}) {
  return {
    ...task,
    location: task.location || task.address || '',
    address: task.address || task.location || '',
    offersCount: task.offersCount ?? task.offerCount ?? undefined,
    isRated: Boolean(task.isRated ?? task.rated),
  }
}

export function normalizeBooking(booking = {}) {
  return {
    ...booking,
    clientName: booking.clientName || booking.userName || booking.user?.name || '',
    clientPhoto: booking.userImageUrl || booking.clientPhoto || booking.clientImageUrl || booking.user?.profilePictureUrl || '',
    workerName: booking.workerName || booking.worker?.name || '',
    workerPhoto: booking.workerImageUrl || booking.workerPhoto || booking.worker?.profilePictureUrl || '',
    workerPhone: booking.workerPhone || booking.worker?.phone || booking.worker?.user?.phone || '',
    date: booking.date || booking.bookingDate || booking.createdAt || '',
    clientPhone: booking.clientPhone || booking.user?.phone || '',
    locationDetails: booking.locationDetails || booking.location_details || '',
    isRated: Boolean(booking.isRated ?? booking.rated),
  }
}

export function normalizeOffer(offer = {}) {
  const worker = offer.worker || {}
  const normalizedWorker = normalizeWorker(worker)
  
  // Handle flat availability from backend OfferResponseDto
  let isAvailable = normalizedWorker.available
  if (offer.workerAvailability) {
    isAvailable = offer.workerAvailability === 'AVAILABLE'
  }

  return {
    ...offer,
    workerName: offer.workerName || normalizedWorker.name || '',
    workerPhoto: offer.workerImageUrl || offer.workerPhoto || normalizedWorker.profilePictureUrl || '',
    workerId: offer.workerId || normalizedWorker.id || '',
    taskId: offer.taskId || offer.task?.id || '',
    workerAvailable: isAvailable,
  }
}
