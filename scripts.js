// Data Storage
let bookings = JSON.parse(localStorage.getItem('cleanbins_bookings')) || [];
let reviews = JSON.parse(localStorage.getItem('cleanbins_reviews')) || [];
let selectedService = null;
let selectedDate = null;
let selectedTime = null;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Services Data
const services = {
    'one-time': {
        name: 'Single Cleaning',
        basePrice: 55,
        description: 'One-time cleaning service',
        type: 'single'
    },
    'monthly': {
        name: 'Monthly Plan',
        basePrice: 120,
        description: '4 cleanings per month',
        type: 'subscription',
        cleaningsPerMonth: 4
    }
};

// Working Hours configuration
const workingHours = {
    '0': { start: 12, end: 19, label: 'Sunday: 12:00 PM - 7:00 PM' }, // Sunday
    '1': { start: 15.5, end: 19.5, label: 'Monday: 3:30 PM - 7:30 PM' }, // Monday
    '2': { start: 15.5, end: 19.5, label: 'Tuesday: 3:30 PM - 7:30 PM' }, // Tuesday
    '3': { start: 15.5, end: 19.5, label: 'Wednesday: 3:30 PM - 7:30 PM' }, // Wednesday
    '4': { start: 15.5, end: 19.5, label: 'Thursday: 3:30 PM - 7:30 PM' }, // Thursday
    '5': { start: 14, end: 18, label: 'Friday: 2:00 PM - 6:00 PM' }, // Friday
    '6': { start: 13.5, end: 18.5, label: 'Saturday: 1:30 PM - 6:30 PM' } // Saturday
};

// Time slot generation
function generateTimeSlotsForDay(dayOfWeek) {
    const hours = workingHours[dayOfWeek.toString()];
    if (!hours) return [];
    
    const slots = [];
    let currentTime = hours.start;
    
    while (currentTime < hours.end) {
        const hour = Math.floor(currentTime);
        const minute = (currentTime % 1) * 60;
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        const timeString = `${displayHour}:${minute === 0 ? '00' : '30'} ${period}`;
        slots.push(timeString);
        currentTime += 0.5; // 30 minute intervals
    }
    
    return slots;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    showPage('home', false);
    loadStatistics();
    loadReviews();
    setupBookingListeners();
    setupScrollHandlers();
});

// Scroll Handlers
function setupScrollHandlers() {
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    const backToTop = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', function() {
        // Hide/show header on scroll
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            header.classList.add('hidden');
        } else {
            // Scrolling up
            header.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        
        // Show/hide back to top button
        if (scrollTop > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    // Handle mobile menu closing on scroll
    window.addEventListener('scroll', function() {
        const navMenu = document.getElementById('navMenu');
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
            mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        }
    });
}

// Scroll to top function
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Page Navigation
function showPage(pageId, scrollToTop = true) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) {
        page.classList.add('active');
        
        if (pageId === 'booking') {
            initializeBooking();
        } else if (pageId === 'reviews') {
            loadReviews();
        }
    }
    
    // Update active nav link
    document.querySelectorAll('nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    document.querySelectorAll('nav a').forEach(link => {
        if (link.textContent === pageId.charAt(0).toUpperCase() + pageId.slice(1) || 
            (pageId === 'home' && link.textContent === 'Home')) {
            link.classList.add('active');
        }
    });
    
    // Close mobile menu
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.remove('active');
    document.getElementById('mobileMenuBtn').innerHTML = '<i class="fas fa-bars"></i>';
    
    // Scroll to top only if explicitly specified
    if (scrollToTop) {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Mobile Menu
document.getElementById('mobileMenuBtn').addEventListener('click', function() {
    const navMenu = document.getElementById('navMenu');
    navMenu.classList.toggle('active');
    this.innerHTML = navMenu.classList.contains('active') 
        ? '<i class="fas fa-times"></i>' 
        : '<i class="fas fa-bars"></i>';
});

// Notification
function showNotification(message, isError = false) {
    const notification = document.getElementById('notification');
    const messageElement = document.getElementById('notificationMessage');
    const icon = notification.querySelector('.notification-icon i');
    
    messageElement.textContent = message;
    
    if (isError) {
        notification.classList.add('error');
        icon.className = 'fas fa-exclamation-circle';
    } else {
        notification.classList.remove('error');
        icon.className = 'fas fa-check-circle';
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// Statistics
function loadStatistics() {
    const totalBookings = bookings.filter(b => b.status !== 'cancelled').length;
    const totalReviews = reviews.length;
    const averageRating = reviews.length > 0 
        ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
        : '0.0';
    
    const totalBookingsElement = document.getElementById('totalBookings');
    const averageRatingElement = document.getElementById('averageRating');
    
    if (totalBookingsElement) totalBookingsElement.textContent = totalBookings;
    if (averageRatingElement) averageRatingElement.textContent = averageRating;
}

// Reviews
function loadReviews() {
    const container = document.getElementById('reviewsGrid');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; grid-column: 1 / -1; padding: 40px; color: var(--gray);">
                <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>No Reviews Yet</h3>
                <p>Be the first to share your experience!</p>
            </div>
        `;
        return;
    }
    
    reviews.slice(0, 6).forEach(review => {
        const reviewElement = document.createElement('div');
        reviewElement.className = 'review-card';
        reviewElement.innerHTML = `
            <div class="review-header">
                <div class="review-avatar">${review.name.charAt(0)}</div>
                <div class="review-info">
                    <h4>${review.name}</h4>
                    <div class="review-date">${formatDate(review.date)}</div>
                </div>
            </div>
            <div class="review-rating">
                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
            </div>
            <div class="review-text">${review.text}</div>
        `;
        container.appendChild(reviewElement);
    });
}

function submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const rating = document.querySelector('input[name="rating"]:checked');
    const text = document.getElementById('reviewText').value.trim();
    
    if (!name || !rating || !text) {
        showNotification('Please fill in all fields!', true);
        return;
    }
    
    const newReview = {
        id: Date.now(),
        name: name,
        rating: parseInt(rating.value),
        text: text,
        date: new Date().toISOString()
    };
    
    reviews.push(newReview);
    localStorage.setItem('cleanbins_reviews', JSON.stringify(reviews));
    
    // Clear form
    document.getElementById('reviewName').value = '';
    document.querySelectorAll('input[name="rating"]').forEach(radio => radio.checked = false);
    document.getElementById('reviewText').value = '';
    
    // Reload
    loadReviews();
    loadStatistics();
    
    showNotification('Review submitted successfully!');
}

// Booking System
function initializeBooking() {
    generateCalendar();
    updateBookingSteps(1);
    
    // Reset selections
    selectedService = null;
    selectedDate = null;
    selectedTime = null;
    
    document.querySelectorAll('.service-option').forEach(o => {
        o.style.borderColor = 'var(--gray-border)';
    });
    
    const nextStep2 = document.getElementById('nextStep2');
    const nextStep3 = document.getElementById('nextStep3');
    if (nextStep2) nextStep2.disabled = true;
    if (nextStep3) nextStep3.disabled = true;
}

function setupBookingListeners() {
    // Previous/Next month buttons
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    
    if (prevMonth) {
        prevMonth.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            generateCalendar();
        });
    }
    
    if (nextMonth) {
        nextMonth.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            generateCalendar();
        });
    }
}

function generateCalendar() {
    const calendar = document.getElementById('calendar');
    const monthYear = document.getElementById('currentMonth');
    if (!calendar || !monthYear) return;
    
    // Clear previous content except headers
    while (calendar.children.length > 7) {
        calendar.removeChild(calendar.lastChild);
    }
    
    // Set month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Get first day of month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-date';
        calendar.appendChild(emptyCell);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateElement = document.createElement('div');
        dateElement.className = 'calendar-date';
        dateElement.textContent = day;
        dateElement.dataset.date = date.toISOString().split('T')[0];
        
        // Check if date is today
        if (date.toDateString() === today.toDateString()) {
            dateElement.classList.add('today');
        }
        
        // Check if date is in the past
        if (date < today) {
            dateElement.classList.add('disabled');
        } else {
            dateElement.addEventListener('click', () => selectDate(dateElement));
        }
        
        calendar.appendChild(dateElement);
    }
}

function selectDate(dateElement) {
    // Remove selection from all dates
    document.querySelectorAll('.calendar-date').forEach(date => {
        date.classList.remove('selected');
    });
    
    // Select clicked date
    dateElement.classList.add('selected');
    selectedDate = dateElement.dataset.date;
    
    // Enable next button
    const nextStep2 = document.getElementById('nextStep2');
    if (nextStep2) nextStep2.disabled = false;
    
    // Generate time slots
    generateTimeSlots(selectedDate);
}

function generateTimeSlots(date) {
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (!timeSlotsContainer) return;
    
    timeSlotsContainer.innerHTML = '';
    
    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay();
    
    // Generate time slots for this day
    const timeSlots = generateTimeSlotsForDay(dayOfWeek);
    
    if (timeSlots.length === 0) {
        timeSlotsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: var(--gray);">
                <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px;"></i>
                <p>No available time slots for this day</p>
            </div>
        `;
        return;
    }
    
    // Get bookings for this date
    const dateBookings = bookings.filter(booking => 
        booking.date === date && booking.status !== 'cancelled'
    );
    
    // Create blocked slots based on existing bookings
    const blockedSlots = new Set();
    
    dateBookings.forEach(booking => {
        const startTime = booking.time;
        const duration = calculateDuration(booking.totalBins);
        const startIndex = timeSlots.indexOf(startTime);
        
        if (startIndex !== -1) {
            // Block the booked slot and subsequent slots based on duration
            for (let i = 0; i < duration; i++) {
                if (startIndex + i < timeSlots.length) {
                    blockedSlots.add(timeSlots[startIndex + i]);
                }
            }
        }
    });
    
    // Create time slot elements
    timeSlots.forEach((slot, index) => {
        const timeSlotElement = document.createElement('div');
        timeSlotElement.className = 'time-slot';
        timeSlotElement.textContent = slot;
        timeSlotElement.dataset.time = slot;
        timeSlotElement.dataset.index = index;
        
        // Check if slot is blocked
        if (blockedSlots.has(slot)) {
            timeSlotElement.classList.add('booked');
            timeSlotElement.title = 'This time slot is already booked';
        } else {
            timeSlotElement.classList.add('available');
            timeSlotElement.addEventListener('click', () => selectTime(timeSlotElement));
        }
        
        timeSlotsContainer.appendChild(timeSlotElement);
    });
}

function calculateDuration(binCount) {
    // Base duration: 30 minutes for 2 bins
    // Additional 30 minutes for each extra 2 bins
    if (binCount <= 2) return 1; // 30 minutes (1 slot)
    if (binCount <= 4) return 2; // 60 minutes (2 slots)
    if (binCount <= 6) return 3; // 90 minutes (3 slots)
    return 4; // 120 minutes (4 slots) for more than 6 bins
}

function selectTime(timeSlotElement) {
    // Remove selection from all time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Select clicked time slot
    timeSlotElement.classList.add('selected');
    selectedTime = timeSlotElement.dataset.time;
    
    // Enable next button
    const nextStep3 = document.getElementById('nextStep3');
    if (nextStep3) nextStep3.disabled = false;
    
    // Show duration info if service selected
    if (selectedService) {
        showDurationInfo();
    }
}

function showDurationInfo() {
    const step3 = document.getElementById('step3');
    if (!step3) return;
    
    // Remove existing duration info
    const existingInfo = step3.querySelector('.duration-info');
    if (existingInfo) existingInfo.remove();
    
    // Get bin count
    const binCount = parseInt(document.getElementById('binCount')?.value || 2);
    const duration = calculateDuration(binCount);
    const durationMinutes = duration * 30;
    
    const durationInfo = document.createElement('div');
    durationInfo.className = 'duration-info';
    durationInfo.innerHTML = `
        <i class="fas fa-clock"></i>
        <p>Service duration: ${durationMinutes} minutes (blocks ${duration} time slots)</p>
    `;
    
    const timeSlotsContainer = document.getElementById('timeSlots');
    if (timeSlotsContainer) {
        step3.insertBefore(durationInfo, timeSlotsContainer.nextSibling);
    }
}

function updateBookingSteps(step) {
    // Update step indicators
    document.querySelectorAll('.step').forEach(stepElement => {
        stepElement.classList.remove('active');
    });
    
    const activeStep = document.querySelector(`.step[data-step="${step}"]`);
    if (activeStep) activeStep.classList.add('active');
    
    // Show/hide step content
    document.querySelectorAll('.booking-step').forEach(stepContent => {
        stepContent.style.display = 'none';
    });
    
    const currentStep = document.getElementById(`step${step}`);
    if (currentStep) currentStep.style.display = 'block';
    
    // Add subscription info for monthly plan
    if (step === 1 && selectedService === 'monthly') {
        showSubscriptionInfo();
    }
}

function nextStep() {
    const currentStep = parseInt(document.querySelector('.step.active')?.dataset.step || 1);
    
    if (currentStep === 1 && !selectedService) {
        showNotification('Please select a service!', true);
        return;
    }
    
    if (currentStep === 2 && !selectedDate) {
        showNotification('Please select a date!', true);
        return;
    }
    
    if (currentStep === 3 && !selectedTime) {
        showNotification('Please select a time!', true);
        return;
    }
    
    if (currentStep === 4) {
        // Validate form
        const name = document.getElementById('customerName').value.trim();
        const phone = document.getElementById('customerPhone').value.trim();
        const address = document.getElementById('customerAddress').value.trim();
        const binCount = document.getElementById('binCount').value;
        const washingLocation = document.getElementById('washingLocation').value;
        
        if (!name || !phone || !address || !binCount || !washingLocation) {
            showNotification('Please fill in all required fields!', true);
            return;
        }
        
        // Submit booking
        submitBooking();
        return;
    }
    
    updateBookingSteps(currentStep + 1);
}

function prevStep() {
    const currentStep = parseInt(document.querySelector('.step.active')?.dataset.step || 1);
    if (currentStep > 1) {
        updateBookingSteps(currentStep - 1);
    }
}

async function submitBooking() {
    try {
        const service = services[selectedService];
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const address = document.getElementById('customerAddress').value;
        const binCount = parseInt(document.getElementById('binCount').value);
        const washingLocation = document.getElementById('washingLocation').value;
        const notes = document.getElementById('customerNotes').value;
        
        // Calculate price
        let price = service.basePrice;
        let extraBins = 0;
        let extraCost = 0;
        
        if (binCount > 2) {
            extraBins = binCount - 2;
            extraCost = extraBins * 15;
            price += extraCost;
        }
        
        // Calculate duration
        const duration = calculateDuration(binCount);
        
        // Check if slots are available
        const dateObj = new Date(selectedDate);
        const dayOfWeek = dateObj.getDay();
        const timeSlots = generateTimeSlotsForDay(dayOfWeek);
        const timeIndex = timeSlots.indexOf(selectedTime);
        
        if (timeIndex === -1) {
            showNotification('Invalid time slot!', true);
            return;
        }
        
        // Check if all required slots are available
        const dateBookings = bookings.filter(booking => 
            booking.date === selectedDate && booking.status !== 'cancelled'
        );
        
        const blockedSlots = new Set();
        dateBookings.forEach(booking => {
            const bookingTimeIndex = timeSlots.indexOf(booking.time);
            if (bookingTimeIndex !== -1) {
                const bookingDuration = calculateDuration(booking.totalBins);
                for (let i = 0; i < bookingDuration; i++) {
                    if (bookingTimeIndex + i < timeSlots.length) {
                        blockedSlots.add(timeSlots[bookingTimeIndex + i]);
                    }
                }
            }
        });
        
        // Check if our slots are available
        for (let i = 0; i < duration; i++) {
            if (timeIndex + i >= timeSlots.length) {
                showNotification('Not enough time available for this service!', true);
                return;
            }
            
            const slot = timeSlots[timeIndex + i];
            if (blockedSlots.has(slot)) {
                showNotification('Time slot is no longer available!', true);
                return;
            }
        }
        
        // For subscription, check monthly limit
        if (selectedService === 'monthly') {
            const customerBookings = bookings.filter(booking => 
                booking.service === 'monthly' &&
                booking.customerPhone === phone &&
                booking.status !== 'cancelled'
            );
            
            // Get bookings for this month
            const currentMonthBookings = customerBookings.filter(booking => {
                const bookingDate = new Date(booking.date);
                return bookingDate.getMonth() === dateObj.getMonth() && 
                       bookingDate.getFullYear() === dateObj.getFullYear();
            });
            
            if (currentMonthBookings.length >= service.cleaningsPerMonth) {
                showNotification(`You have already used all ${service.cleaningsPerMonth} cleanings for this month!`, true);
                return;
            }
        }
        
        // Create booking
        const booking = {
            id: Date.now(),
            service: selectedService,
            serviceName: service.name,
            price: price,
            totalBins: binCount,
            duration: duration,
            date: selectedDate,
            time: selectedTime,
            customerName: name,
            customerPhone: phone,
            customerAddress: address,
            washingLocation: washingLocation,
            customerNotes: notes,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };
        
        // Save to local storage
        bookings.push(booking);
        localStorage.setItem('cleanbins_bookings', JSON.stringify(bookings));
        
        // Send Telegram notification
        await sendToTelegram(booking);
        
        // Show success
        showNotification('Booking confirmed successfully!');
        
        // Reset form
        resetBookingForm();
        
        // Update statistics
        loadStatistics();
        
        // Return to home
        setTimeout(() => showPage('home', false), 1500);
        
    } catch (error) {
        console.error('Booking error:', error);
        showNotification('Error submitting booking. Please try again.', true);
    }
}

function resetBookingForm() {
    selectedService = null;
    selectedDate = null;
    selectedTime = null;
    
    document.querySelectorAll('.service-option').forEach(o => {
        o.style.borderColor = 'var(--gray-border)';
    });
    
    const customerName = document.getElementById('customerName');
    const customerPhone = document.getElementById('customerPhone');
    const customerAddress = document.getElementById('customerAddress');
    const binCount = document.getElementById('binCount');
    const washingLocation = document.getElementById('washingLocation');
    const customerNotes = document.getElementById('customerNotes');
    
    if (customerName) customerName.value = '';
    if (customerPhone) customerPhone.value = '';
    if (customerAddress) customerAddress.value = '';
    if (binCount) binCount.value = '';
    if (washingLocation) washingLocation.value = '';
    if (customerNotes) customerNotes.value = '';
}

function selectService(serviceType) {
    selectedService = serviceType;
    document.querySelectorAll('.service-option').forEach(o => {
        o.style.borderColor = 'var(--gray-border)';
    });
    
    const selectedOption = document.querySelector(`.service-option[data-service="${serviceType}"]`);
    if (selectedOption) {
        selectedOption.style.borderColor = 'var(--primary)';
    }
    
    // If monthly plan selected, show subscription info
    if (serviceType === 'monthly') {
        showSubscriptionInfo();
    }
}

function showSubscriptionInfo() {
    const step1 = document.getElementById('step1');
    if (!step1) return;
    
    // Remove existing subscription info
    const existingInfo = step1.querySelector('.subscription-info');
    if (existingInfo) existingInfo.remove();
    
    const subscriptionInfo = document.createElement('div');
    subscriptionInfo.className = 'subscription-info';
    subscriptionInfo.innerHTML = `
        <h4><i class="fas fa-info-circle"></i> Monthly Plan Information</h4>
        <p style="color: var(--primary-dark); margin-bottom: 10px;">
            With the monthly plan, you get:
        </p>
        <ul>
            <li><i class="fas fa-check"></i> ${services.monthly.cleaningsPerMonth} cleanings per month</li>
            <li><i class="fas fa-check"></i> Book at any available time during working hours</li>
            <li><i class="fas fa-check"></i> Cancel or reschedule anytime</li>
            <li><i class="fas fa-check"></i> 10% discount on extra bins</li>
        </ul>
        <p style="color: var(--primary-dark); margin-top: 10px; font-weight: 600;">
            You can schedule your cleanings throughout the month as needed!
        </p>
    `;
    
    const serviceOptions = step1.querySelector('.service-option[data-service="monthly"]');
    if (serviceOptions) {
        step1.insertBefore(subscriptionInfo, serviceOptions.nextSibling);
    }
}

async function sendToTelegram(booking) {
    const TELEGRAM_BOT_TOKEN = '6540670567:AAHPjAlL7Ii-TxhOSIxLhNaAb4lCgtYtKIE';
    const TELEGRAM_CHAT_ID = '5980839790';
    
    const formattedDate = new Date(booking.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const durationMinutes = booking.duration * 30;
    
    const message = `
📅 *NEW BOOKING CONFIRMED* (ID: ${booking.id})

👤 *Customer:* ${booking.customerName}
📱 *Phone:* ${booking.customerPhone}
📍 *Address:* ${booking.customerAddress}

🔧 *Service:* ${booking.serviceName}
💰 *Price:* $${booking.price}
🗑️ *Bins:* ${booking.totalBins} total
⏱️ *Duration:* ${durationMinutes} minutes
📍 *Location:* ${booking.washingLocation}
🗓️ *Date:* ${formattedDate}
⏰ *Time:* ${booking.time}
✅ *Status:* ✅ **CONFIRMED**

${booking.customerNotes ? `📝 *Notes:* ${booking.customerNotes}\n` : ''}
*Water access required at selected location*
    `;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        
        return await response.json();
    } catch (error) {
        console.error('Telegram error:', error);
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// Export functions for use in HTML
window.scrollToTop = scrollToTop;
window.showPage = showPage;
window.selectService = selectService;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.submitBooking = submitBooking;
window.submitReview = submitReview;
