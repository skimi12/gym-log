cmake_minimum_required(VERSION 3.20)
project(GymLogAnalytics VERSION 1.0 LANGUAGES CXX)

if(MSVC AND NOT CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  message(FATAL_ERROR "Use GCC or Clang (e.g. MinGW on Windows) for the freestanding core.")
endif()

add_library(gym_analytics STATIC native/src/analytics_core.cpp)
target_include_directories(gym_analytics PUBLIC native/include)
target_compile_features(gym_analytics PUBLIC cxx_std_17)
target_compile_options(gym_analytics PRIVATE -Wall -Wextra -Werror -pedantic -ffp-contract=off)

include(CTest)
if(BUILD_TESTING)
  add_executable(analytics_tests native/tests/analytics_core_test.cpp)
  target_link_libraries(analytics_tests PRIVATE gym_analytics)
  target_compile_options(analytics_tests PRIVATE -Wall -Wextra -Werror -pedantic -ffp-contract=off)
  add_test(NAME analytics_core COMMAND analytics_tests)
endif()
