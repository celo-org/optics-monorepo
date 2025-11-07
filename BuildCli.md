brew install llvm@14

export LIBCLANG_PATH="$(brew --prefix llvm@14)/lib"
export LLVM_CONFIG_PATH="$(brew --prefix llvm@14)/bin/llvm-config"
export CPPFLAGS="-I$(brew --prefix llvm@14)/include"
export LDFLAGS="-L$(brew --prefix llvm@14)/lib"

export CFLAGS="-DHAVE_UNISTD_H=1 -Dfdopen=fdopen"
export CXXFLAGS="-DHAVE_UNISTD_H=1 -Dfdopen=fdopen"