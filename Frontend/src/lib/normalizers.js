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
    salary: worker.salary ?? worker.dailyRate ?? worker.salaryExpectation ?? null,
    dailyRate: worker.dailyRate ?? worker.salary ?? worker.salaryExpectation ?? null,
    salaryExpectation: worker.salaryExpectation ?? worker.salary ?? worker.dailyRate ?? null,
    profilePictureUrl: worker.profilePictureUrl || worker.imageUrl || '',
    imageUrl: worker.imageUrl || worker.profilePictureUrl || '',
    phone: worker.phone || worker.phoneNumber || worker.userPhone || '',
    phoneNumber: worker.phoneNumber || worker.phone || worker.userPhone || '',
    rating: worker.rating ?? worker.averageRating ?? null,
    averageRating: worker.averageRating ?? worker.rating ?? null,
    availability: worker.availability || (worker.available ? 'AVAILABLE' : 'BUSY'),
    available: typeof worker.available === 'boolean'
      ? worker.available
      : worker.availability === 'AVAILABLE',
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
    budget: task.budget ?? task.price ?? null,
    offersCount: task.offersCount ?? task.offerCount ?? undefined,
    isRated: Boolean(task.isRated ?? task.rated),
  }
}

export function normalizeBooking(booking = {}) {
  return {
    ...booking,
    clientName: booking.clientName || booking.userName || '',
    workerName: booking.workerName || '',
    date: booking.date || booking.bookingDate || booking.createdAt || '',
    isRated: Boolean(booking.isRated ?? booking.rated),
  }
}
