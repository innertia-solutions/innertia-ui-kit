#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# ─── Colors ─────────────────────────────────────────────────────
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
RESET="\033[0m"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║     innertia-ui-kit — publisher      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════╝${RESET}"
echo ""

# ─── Select package ─────────────────────────────────────────────
echo -e "${CYAN}¿Qué paquete publicar?${RESET}"
echo "  1) @innertia-solutions/ui"
echo "  2) @innertia-solutions/theme"
echo "  3) Ambos"
echo ""
read -p "Opción [1/2/3]: " PKG_CHOICE

case $PKG_CHOICE in
    1) PACKAGES=("ui") ;;
    2) PACKAGES=("theme") ;;
    3) PACKAGES=("ui" "theme") ;;
    *) echo -e "${RED}Opción inválida${RESET}"; exit 1 ;;
esac

# ─── Select bump type ────────────────────────────────────────────
echo ""
echo -e "${CYAN}¿Tipo de versión?${RESET}"
echo "  1) patch  (0.1.0 → 0.1.1)  bug fixes"
echo "  2) minor  (0.1.0 → 0.2.0)  nuevos componentes"
echo "  3) major  (0.1.0 → 1.0.0)  breaking changes"
echo ""
read -p "Opción [1/2/3]: " BUMP_CHOICE

case $BUMP_CHOICE in
    1) BUMP="patch" ;;
    2) BUMP="minor" ;;
    3) BUMP="major" ;;
    *) echo -e "${RED}Opción inválida${RESET}"; exit 1 ;;
esac

# ─── OTP ────────────────────────────────────────────────────────
echo ""
read -p "🔐 OTP de tu autenticador npm: " OTP

if [ -z "$OTP" ]; then
    echo -e "${RED}OTP requerido${RESET}"
    exit 1
fi

echo ""

# ─── Publish each package ────────────────────────────────────────
for PKG in "${PACKAGES[@]}"; do
    PKG_DIR="$ROOT/packages/$PKG"
    PKG_NAME=$(node -p "require('$PKG_DIR/package.json').name")
    OLD_VERSION=$(node -p "require('$PKG_DIR/package.json').version")

    echo -e "${BOLD}── $PKG_NAME ──────────────────────────────${RESET}"

    # Bump version
    cd "$PKG_DIR"
    npm version $BUMP --no-git-tag-version > /dev/null
    NEW_VERSION=$(node -p "require('./package.json').version")

    echo -e "  ${YELLOW}Versión:${RESET} $OLD_VERSION → ${GREEN}$NEW_VERSION${RESET}"

    # Publish
    echo -e "  ${YELLOW}Publicando...${RESET}"
    npm publish --access public --otp=$OTP

    echo -e "  ${GREEN}✅ $PKG_NAME@$NEW_VERSION publicado${RESET}"
    echo ""
done

# ─── Git commit + tag ────────────────────────────────────────────
cd "$ROOT"

# Build commit message
if [ ${#PACKAGES[@]} -eq 2 ]; then
    UI_VER=$(node -p "require('./packages/ui/package.json').version")
    THEME_VER=$(node -p "require('./packages/theme/package.json').version")
    COMMIT_MSG="chore: release ui@$UI_VER theme@$THEME_VER"
else
    PKG=${PACKAGES[0]}
    VER=$(node -p "require('./packages/$PKG/package.json').version")
    COMMIT_MSG="chore: release $PKG@$VER"
fi

git add packages/ui/package.json packages/theme/package.json
git commit -m "$COMMIT_MSG"
git push

echo -e "${GREEN}${BOLD}🚀 Listo! Todo publicado y commiteado.${RESET}"
echo ""
