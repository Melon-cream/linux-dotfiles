if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="powerlevel10k/powerlevel10k"

plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
)

typeset -U path PATH
path+=("$HOME/.local/bin")
export PATH

source "$ZSH/oh-my-zsh.sh"

alias ll='ls -laF'
alias cl='clear'

[[ -f "$HOME/.p10k.zsh" ]] && source "$HOME/.p10k.zsh"
eval "$(mise activate zsh)"
