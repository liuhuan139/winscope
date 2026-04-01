#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "========================================="
echo "Winscope Installer"
echo "========================================="

# Check source files exist
check_source() {
    if [ ! -e "$1" ]; then
        echo "Error: Source not found: $1"
        exit 1
    fi
}

check_source "$SCRIPT_DIR/winscope_env"
check_source "$SCRIPT_DIR/winscope_gui/winscope"
check_source "$SCRIPT_DIR/winscope_gui/winscope.svg"
check_source "$SCRIPT_DIR/winscope_gui/winscope.desktop"

# 1. Copy winscope_env to /usr/local/winscope/
echo ""
echo "[1/6] Copying winscope_env to /usr/local/winscope/"
sudo mkdir -p /usr/local/winscope
sudo cp -r "$SCRIPT_DIR/winscope_env"/* /usr/local/winscope/
echo "Done."

# 2. Copy winscope executable to /usr/bin/
echo ""
echo "[2/6] Copying winscope executable to /usr/bin/"
sudo cp "$SCRIPT_DIR/winscope_gui/winscope" /usr/bin/winscope
sudo chmod 755 /usr/bin/winscope
echo "Done."

# 3. Copy winscope.svg to /usr/share/winscope/
echo ""
echo "[3/6] Copying icon to /usr/share/winscope/"
sudo mkdir -p /usr/share/winscope
sudo cp "$SCRIPT_DIR/winscope_gui/winscope.svg" /usr/share/winscope/winscope.svg
echo "Done."

# 4. Copy winscope.desktop to ~/.local/share/applications/
echo ""
echo "[4/6] Copying desktop file to ~/.local/share/applications/"
mkdir -p "$HOME/.local/share/applications"
cp "$SCRIPT_DIR/winscope_gui/winscope.desktop" "$HOME/.local/share/applications/winscope.desktop"
echo "Done."

# 5. Check and install Node.js and npm
echo ""
echo "[5/6] Checking Node.js and npm..."

check_command() {
    command -v "$1" >/dev/null 2>&1
}

install_nodejs() {
    echo "Node.js and npm not found. Installing..."
    if check_command apt-get; then
        # Debian/Ubuntu
        sudo apt-get update
        sudo apt-get install -y nodejs npm
    elif check_command yum; then
        # RHEL/CentOS
        sudo yum install -y nodejs npm
    elif check_command dnf; then
        # Fedora
        sudo dnf install -y nodejs npm
    elif check_command pacman; then
        # Arch Linux
        sudo pacman -S --noconfirm nodejs npm
    elif check_command brew; then
        # macOS with Homebrew
        brew install node
    else
        echo "Error: Could not detect package manager. Please install Node.js and npm manually."
        exit 1
    fi
}

if ! check_command node || ! check_command npm; then
    install_nodejs
else
    echo "Node.js and npm are already installed."
fi

# 6. Check and install webpack and webpack-cli
echo ""
echo "[6/6] Checking npm packages..."

check_npm_package() {
    if ! npm list -g "$1" >/dev/null 2>&1; then
        echo "Installing $1..."
        sudo npm install -g "$1"
    else
        echo "$1 is already installed."
    fi
}

check_npm_package "webpack"
check_npm_package "webpack-cli"

echo ""
echo "========================================="
echo "Installation completed successfully!"
echo "========================================="
