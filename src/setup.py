import pyfiglet
from colorama import Fore, Style, init
import json
import firebase_admin
from firebase_admin import credentials, firestore
import sys


# Initialize colorama
init()

def print_ascii_art(text):
    ascii_art = pyfiglet.figlet_format(text)
    print(Fore.CYAN + ascii_art + Style.RESET_ALL)

def read_config_file(file_path):
    with open(file_path, 'r') as file:
        return json.load(file)

def write_config_file(file_path, data):
    with open(file_path, 'w') as file:
        json.dump(data, file, indent=4)

def validate_firebase_config(config):
    for key, value in config.items():
        if not value:
            print(Fore.RED + f"Empty value found for key: {key}. Please complete firebase config file." + Style.RESET_ALL)
            sys.exit()
    
def get_user_input(prompt, valid_responses=None):
    while True:
        user_input = input(prompt).strip().lower()
        if valid_responses is None or user_input in valid_responses:
            return user_input
        print(Fore.RED + f"Invalid input. Please try again({valid_responses})" + Style.RESET_ALL)

def main():
    print_ascii_art("Brevurl")
    
    brconfig_dst = input("Please enter brevurl_config.json file destination: ")
    frconfig_dst = input("Please enter firebase_config.json file destination: ")
    
    try:
        firebase_config = read_config_file(frconfig_dst)
        brevurl_config = read_config_file(brconfig_dst)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(Fore.RED + f"Error reading configuration files: {e}" + Style.RESET_ALL)
        sys.exit()

    print(Fore.YELLOW + "Checking firebase config file..." + Style.RESET_ALL)
    validate_firebase_config(firebase_config)
    print(Fore.GREEN + "Done" + Style.RESET_ALL)

    domain = input("Please enter the URL address where the server is located (e.g., https://example.com): ")
    port = input("Please enter the port that the server application will use (this port will be used for routing on nginx): ")
    account_available = get_user_input(
        "Would you like to activate the account system? (y/n): ",
        valid_responses={'y', 'n'}
    )
    account_bool = 1 if account_available == 'y' else 0

    print(Fore.YELLOW + "Editing the brevurl config file..." + Style.RESET_ALL)
    


    
    brevurl_config.update({
        "domain": domain,
        "account_available": account_bool,
        "port": port,
        "firebase_configdst": frconfig_dst
    })
    
    try:
        # Initialize firebase
        cred = credentials.Certificate(frconfig_dst)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        db.collection("urls").document("scihook").set({'original_url': 'https://scihook.org/'}) #create url entry
        
        write_config_file(brconfig_dst, brevurl_config)
        print(Fore.GREEN + "Successfully adjusted! If you want to make changes in the future, you can use this script or edit the config JSON files directly." + Style.RESET_ALL)
    except Exception as e:
        print(Fore.RED + f"Error: {e}" + Style.RESET_ALL)

if __name__ == "__main__":
    main()
