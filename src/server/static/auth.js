let db, auth;

async function initializeFirebase() {
    const response = await fetch('/config-web');
    const firebaseConfig = await response.json();
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
}

initializeFirebase();

async function signin(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;



        if (user) {
            if (user.emailVerified) {
                const idToken = await user.getIdToken();

                const response = await fetch('/login-process', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ idToken }) 
                });

                const data = await response.json();

                if (response.ok) {
                    showNotificationauth("Successfuly signed in", "success-auth")
                    window.location.href = '/';

                } else {
                    showNotificationauth(`Error: ${data.error}`, "error-auth")

                }
            } else {
                showNotificationauth('Email is not verified', 'need-verify-auth');

            }
        }


    } catch (error) {
        if(error.message.includes("INVALID_LOGIN_CREDENTIALS")){
            showNotificationauth("Username or password is wrong", "error-auth")


        }else{
            showNotificationauth(`Error: ${error}`, "error-auth")

        }

    }

}

async function SignIn(event) {
    event.preventDefault();
    const email_element = document.getElementById('email');
    const password_element = document.getElementById('password');
    let email = email_element.value;
    let password = password_element.value;
    email_element.value = "";
    password_element.value = "";
    signin(email, password);
}

async function Register(event) {
    event.preventDefault();
    const email_element = document.getElementById('email');
    const password_element = document.getElementById('password');
    const password_confirm_element = document.getElementById('password-confirm');
    const username_element = document.getElementById('username');
    let email = email_element.value;
    let password = password_element.value;
    let password_confirm = password_confirm_element.value;
    let username = username_element.value;

    try {
        if (password == password_confirm) {
            await auth.createUserWithEmailAndPassword(email, password).then((userCredential) => {
                var user = userCredential.user;
                user.sendEmailVerification()
            })
                .catch((error) => {
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    showNotificationauth(`Error: ${errorMessage}`, 'error-auth');
                });
            await db.collection("users").doc(email).set({
                username: username,
                role: "user",
            })
            showNotificationauth('Successfully registered!', 'success-auth');
            email_element.value = "";
            password_element.value = "";
            password_confirm_element.value = "";
            username_element.value = "";
            signin(email, password);
        } else {
            console.error('Auth Error: Different passwords');
            showNotificationauth("Auth Error: The passwords don't match.", 'error-auth');
            email_element.value = "";
            password_element.value = "";
            password_confirm_element.value = "";
            username_element.value = "";
            return;
        }
    } catch (e) {
        console.error('Auth Error:', e);
        showNotificationauth(`Auth Error: ${e.message}`, 'error-auth');
        email_element.value = "";
        password_element.value = "";
        password_confirm_element.value = "";
        username_element.value = "";
        return;
    }
}


async function Recover(event) {
    event.preventDefault();
    const userEmail = document.getElementById("email").value;
    try {
        await firebase.auth().sendPasswordResetEmail(userEmail);
        showNotificationauth("Password reset email successfuly sent!", 'need-verify-auth');
    } catch (error) {
        showNotificationauth(`Error sending email: ${error.message}`, 'error-auth');
    }
}



function showNotificationauth(message, type = "error-auth", copyText) {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    const closeBtn = document.getElementById('close-notification');
    const sendEmailBtn = document.getElementById('send-email');

    notificationMessage.textContent = message;

    if (type === "error-auth") {
        notification.style.backgroundColor = '#dc3545';
        sendEmailBtn.classList.add('hidden');
    } else if (type === "need-verify-auth") {
        notification.style.backgroundColor = '#15BFD2';
        sendEmailBtn.classList.remove('hidden');
    } else if (type === "success-auth") {
        notification.style.backgroundColor = '#10EA34';
        sendEmailBtn.classList.add('hidden');
    }
    notification.classList.remove('hidden');
    notification.classList.add('visible');

    closeBtn.addEventListener('click', () => {
        notification.classList.remove('visible');
        notification.classList.add('hidden');
    });

    sendEmailBtn.addEventListener('click', () => {
        if (document.title.includes("Recover")) {
            window.location.href = '/login';
        } else {
            var user = auth.currentUser;
            if (user) {
                user.sendEmailVerification()
                    .then(() => {
                        showNotificationauth('Verification email sent!', 'success-auth');
                    })
                    .catch((error) => {
                        showNotificationauth(`Error sending email: ${error}`, 'error-auth');
                    });
            }
        }
    });
}

async function getUsername(email) {
    const docRef = await db.collection("users").doc(email);
    const docSnap = await docRef.get();
    if (docSnap.exists) {
        const data = docSnap.data();
        return [data["username"], data["role"]];
    } else {
        console.log("Doc not found");
        return null;
    }
}

async function logout() {
    firebase.auth().signOut().then(() => {
        fetch('/logout')
            .then(response => {
                if (!response.ok) {
                    console.error('Error signing out');
                }
            })

        window.location.href = '/';
    }).catch((error) => {
        console.error('Error signing out: ', error);
    });
}

async function resetPassword(event) {
    event.preventDefault();
    const current_password_element = document.getElementById('current-password');
    const password_element = document.getElementById('new-password');
    const password_control_element = document.getElementById('confirm-password');
    let new_password = password_element.value;
    let password_control = password_control_element.value;
    let current_password = current_password_element.value;
    fetch('/getloginstatus')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network err');
        }
        return response.json();  
    })
    .then(data => {
        const login_status = data.status;
        const email = data.email;
  
        if (login_status === "True") {
            const user = auth.currentUser;

            if (user) {
                const credential = firebase.auth.EmailAuthProvider.credential(email, current_password);
        
                user.reauthenticateWithCredential(credential)
                    .then(() => {
        
                        if (new_password == password_control) {
                            if (new_password != current_password) {
                                user.updatePassword(new_password)
                                    .then(() => {
                                        password_element.value = "";
                                        password_control_element.value = "";
                                        current_password_element.value = "";
                                        showNotificationauth("Your password updated successfuly", "success-auth");
                                    })
                                    .catch((error) => {
                                        password_element.value = "";
                                        password_control_element.value = "";
                                        current_password_element.value = "";
                                        showNotificationauth(`Error: ${error.message}`, "error-auth");
        
                                    });
        
                            } else {
                                password_element.value = "";
                                password_control_element.value = "";
                                current_password_element.value = "";
                                showNotificationauth("Your password cannot be the same as before", "error-auth");
        
                            }
                        } else {
                            password_element.value = "";
                            password_control_element.value = "";
                            current_password_element.value = "";
                            showNotificationauth("Passwords dont match", "error-auth");
        
                        }
        
        
                    })
                    .catch((e) => {
                        password_element.value = "";
                        password_control_element.value = "";
                        current_password_element.value = "";
                        if (e.message.includes('INVALID_LOGIN_CREDENTIALS')) {
                            showNotificationauth("Your current password is incorrect", "error-auth")
                        } else {
                            showNotificationauth(`Error: ${e.message}`, "error-auth");
                        }
        
                    });
            } else {
                password_element.value = "";
                password_control_element.value = "";
                current_password_element.value = "";
                showNotificationauth("Auth Error. Please relogin", "error-auth");
            }

        }else{
            showNotificationauth("Error: Your password could not be reset. Try again or log out and reset your password from account recovery page","error-auth")
        }

    })
    .catch(error => {
        console.error('Error:', error);
        showNotificationauth("Error: Your password could not be reset. Try again or log out and reset your password from account recovery page","error-auth")

    });
    





}

function deleteCookie(name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

function getCookie(name) {
    let cookieArr = document.cookie.split(";");

    for (let i = 0; i < cookieArr.length; i++) {
        let cookiePair = cookieArr[i].split("=");

        if (name === cookiePair[0].trim()) {
            return decodeURIComponent(cookiePair[1]);
        }
    }

    return null;
}

