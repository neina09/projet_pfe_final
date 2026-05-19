export const validateFullName = (name) => {
  // Allow letters, numbers, spaces, and Arabic characters.
  // We block common special symbols.
  // Crucially: It must contain at least one letter (Latin or Arabic).
  const hasLetter = /[a-zA-Z\u0600-\u06FF]/.test(name)
  const noSpecialSymbols = /^[^\@\#\$\%\^\&\*\(\)\=\+\[\]\{\}\<\>\?\/\\\|]+$/.test(name)
  
  return hasLetter && noSpecialSymbols
}

export const validatePhone = (phone) => {
  // Exactly 8 digits for Mauritanian phone numbers
  const regex = /^[0-9]{8}$/
  return regex.test(phone)
}

export const validatePassword = (password) => {
  // Min 8 characters, at least one letter and one number
  const hasLetter = /[\p{L}a-zA-Z]/u.test(password)
  const hasNumber = /[0-9]/.test(password)
  const isLongEnough = password.length >= 8
  
  return {
    isValid: hasLetter && hasNumber && isLongEnough,
    hasLetter,
    hasNumber,
    isLongEnough
  }
}
