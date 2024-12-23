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
        const signin = await auth.signInWithEmailAndPassword(email, password);
        let username = await getUsername(email);
        if (username == null) {
            showNotificationauth('Auth Error: Username not found', 'error-auth');
            return;
        }
        var user = auth.currentUser;

        if (user) {
            if (user.emailVerified) {
                showNotificationauth('Successfully signed in!', 'success-auth');
                let now = new Date();
                now.setMonth(now.getMonth() + 1);
                let expire_date = now.toUTCString();
                document.cookie = "email=" + email + ";" + "expires=" + expire_date + "; path=/";
                document.cookie = "username=" + username[0] + ";" + "expires=" + expire_date + "; path=/";
                document.cookie = "role=" + username[1] + ";" + "expires=" + expire_date + "; path=/";
                window.location.href = '/';
            } else {
                showNotificationauth('Email is not verified', 'need-verify-auth');
            }
        }
    } catch (e) {
        if (e.message.includes('INVALID_LOGIN_CREDENTIALS')) {
            console.error('Auth Error:', e);
            showNotificationauth('Invalid username or password', 'error-auth');
        } else {
            console.error('Auth Error:', e);
            showNotificationauth(`Auth Error: ${e.message}`, 'error-auth');
        }
        return;
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
        if (document.title == "Recover Account | Brevurl") {
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

function logout() {
    firebase.auth().signOut().then(() => {
        deleteCookie("username");
        deleteCookie("email");
        deleteCookie("role");
        window.location.href = '/';
    }).catch((error) => {
        console.error('Error signing out: ', error);
    });
}

function resetPassword(event) {
    event.preventDefault();
    const current_password_element = document.getElementById('current-password');
    const password_element = document.getElementById('new-password');
    const password_control_element = document.getElementById('confirm-password');
    let new_password = password_element.value;
    let password_control = password_control_element.value;
    let current_password = current_password_element.value;



    const user = auth.currentUser;
    const email = getCookie("email");

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

