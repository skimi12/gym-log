#include <gym/analytics_core.hpp>

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>

namespace {
int checks = 0;
int cases = 0;

void check(bool condition, const char* expression, int line) {
  ++checks;
  if (!condition) {
    std::cerr << "FAIL line " << line << ": " << expression << '\n';
    std::exit(1);
  }
}

#define CHECK(expression) check((expression), #expression, __LINE__)

void near(double actual, double expected) {
  CHECK(std::isfinite(actual));
  CHECK(std::abs(actual - expected) <= 1e-12 * (1 + std::abs(expected)));
}

using gym::Accumulator;
using gym::LoadType;
using gym::Metric;

void absent(const Accumulator& accumulator, Metric metric) {
  CHECK(!accumulator.has_metric(metric));
  CHECK(accumulator.metric(metric) == 0);
}

void no_metrics(const Accumulator& accumulator) {
  for (int id = 0; id < 4; ++id) absent(accumulator, static_cast<Metric>(id));
}

void run_tests() {
  const double infinity = std::numeric_limits<double>::infinity();
  const double nan = std::numeric_limits<double>::quiet_NaN();
  const double largest = std::numeric_limits<double>::max();
  Accumulator a;

  ++cases;  // Empty and reset accumulators never manufacture a zero metric.
  no_metrics(a);
  for (int type = 0; type < 4; ++type) {
    a.reset(static_cast<LoadType>(type));
    no_metrics(a);
    CHECK(a.volume() == 0);
    CHECK(a.total_reps() == 0);
    CHECK(a.recorded_count() == 0);
  }

  ++cases;  // Ordinary weighted data uses separate maxima and Epley estimates.
  a.reset(LoadType::Weighted);
  a.add_set(100, 5, true);
  a.add_set(90, 12, true);
  near(a.metric(Metric::MaxWeight), 100);
  near(a.metric(Metric::MaxReps), 12);
  near(a.metric(Metric::Estimated1RM), 126);
  near(a.metric(Metric::Volume), 1580);
  near(a.total_reps(), 17);
  CHECK(a.recorded_count() == 2);

  ++cases;  // Invalid repetitions exclude the whole set, not just its weight.
  for (double reps : {0.0, -1.0, infinity, -infinity, nan}) {
    a.add_set(largest, reps, true);
  }
  near(a.metric(Metric::MaxWeight), 100);
  near(a.volume(), 1580);
  CHECK(a.recorded_count() == 2);

  ++cases;  // Missing, negative, and non-finite weights still record repetitions.
  a.reset(LoadType::Weighted);
  a.add_set(123, 4, false);
  for (double weight : {0.0, -1.0, infinity, -infinity, nan}) {
    a.add_set(weight, 3, true);
  }
  absent(a, Metric::MaxWeight);
  absent(a, Metric::Estimated1RM);
  absent(a, Metric::Volume);
  near(a.metric(Metric::MaxReps), 4);
  near(a.total_reps(), 19);
  CHECK(a.recorded_count() == 6);

  ++cases;  // Fractional positive reps are recorded, but outside the Epley model.
  a.reset(LoadType::Weighted);
  a.add_set(80, 2.5, true);
  near(a.volume(), 200);
  near(a.metric(Metric::MaxReps), 2.5);
  absent(a, Metric::Estimated1RM);

  ++cases;  // Epley includes 1 and 12, but not their adjacent representable values.
  a.reset(LoadType::Weighted);
  a.add_set(30, 1, true);
  near(a.metric(Metric::Estimated1RM), 31);
  a.add_set(30, 12, true);
  near(a.metric(Metric::Estimated1RM), 42);
  for (double reps : {0.5, 12.5, 13.0, std::nextafter(1.0, 2.0),
                      std::nextafter(12.0, 11.0)}) {
    a.add_set(1000, reps, true);
  }
  near(a.metric(Metric::Estimated1RM), 42);

  ++cases;  // Bodyweight exposes reps only, while raw volume remains reusable.
  a.reset(LoadType::Bodyweight);
  a.add_set(50, 8, true);
  near(a.metric(Metric::MaxReps), 8);
  absent(a, Metric::MaxWeight);
  absent(a, Metric::Estimated1RM);
  absent(a, Metric::Volume);
  near(a.volume(), 400);

  ++cases;  // Added-weight sets have a valid zero even when the weight is absent.
  a.reset(LoadType::BodyweightAdded);
  a.add_set(100, 8, false);
  CHECK(a.has_metric(Metric::MaxWeight));
  CHECK(a.metric(Metric::MaxWeight) == 0);
  for (double weight : {-5.0, infinity, -infinity, nan}) a.add_set(weight, 4, true);
  CHECK(a.metric(Metric::MaxWeight) == 0);
  CHECK(!std::signbit(a.metric(Metric::MaxWeight)));
  absent(a, Metric::Estimated1RM);
  absent(a, Metric::Volume);

  ++cases;
  a.add_set(12.5, 3, true);
  near(a.metric(Metric::MaxWeight), 12.5);
  near(a.metric(Metric::MaxReps), 8);

  ++cases;  // Assistance minimizes recorded nonnegative weight, including zero.
  a.reset(LoadType::Assisted);
  a.add_set(20, 8, true);
  a.add_set(10, 5, true);
  a.add_set(2, 0, true);
  a.add_set(-1, 8, true);
  near(a.metric(Metric::MaxWeight), 10);
  a.add_set(0, 4, true);
  CHECK(a.has_metric(Metric::MaxWeight));
  CHECK(a.metric(Metric::MaxWeight) == 0);
  absent(a, Metric::Estimated1RM);
  absent(a, Metric::Volume);

  ++cases;  // Invalid assistance never silently turns into zero assistance.
  a.reset(LoadType::Assisted);
  a.add_set(0, 7, false);
  for (double weight : {-3.0, infinity, nan}) a.add_set(weight, 6, true);
  absent(a, Metric::MaxWeight);
  near(a.metric(Metric::MaxReps), 7);

  ++cases;  // JavaScript Math.min preserves negative zero in either order.
  for (bool negative_first : {false, true}) {
    a.reset(LoadType::Assisted);
    a.add_set(negative_first ? -0.0 : 0.0, 1, true);
    a.add_set(negative_first ? 0.0 : -0.0, 1, true);
    CHECK(std::signbit(a.metric(Metric::MaxWeight)));
  }

  ++cases;  // Output overflow follows JS numbers; it is not mistaken for absence.
  a.reset(LoadType::Weighted);
  a.add_set(largest, 12, true);
  CHECK(a.has_metric(Metric::Estimated1RM));
  CHECK(std::isinf(a.metric(Metric::Estimated1RM)));
  CHECK(a.has_metric(Metric::Volume));
  CHECK(std::isinf(a.metric(Metric::Volume)));
  near(a.metric(Metric::MaxWeight), largest);
  a.add_set(0, largest, false);
  a.add_set(0, largest, false);
  CHECK(std::isinf(a.total_reps()));
  near(a.metric(Metric::MaxReps), largest);

  ++cases;  // Positive subnormal values are valid even when their product is zero.
  a.reset(LoadType::Weighted);
  const double smallest = std::numeric_limits<double>::denorm_min();
  a.add_set(smallest, smallest, true);
  CHECK(a.has_metric(Metric::MaxWeight));
  CHECK(a.metric(Metric::MaxWeight) == smallest);
  CHECK(a.has_metric(Metric::Volume));
  CHECK(a.metric(Metric::Volume) == 0);
  CHECK(a.total_reps() == smallest);
  absent(a, Metric::Estimated1RM);

  ++cases;  // Independent instances do not leak state; reset clears every field.
  Accumulator other;
  other.add_set(50, 10, true);
  for (int iteration = 0; iteration < 20; ++iteration) {
    a.reset(static_cast<LoadType>(iteration % 4));
    no_metrics(a);
    CHECK(a.volume() == 0);
    CHECK(a.total_reps() == 0);
    CHECK(a.recorded_count() == 0);
    a.add_set(10, 3, true);
  }
  near(other.volume(), 500);

  ++cases;  // Extrema and exact integer sums are independent of insertion order.
  for (int type = 0; type < 4; ++type) {
    Accumulator forward;
    Accumulator reverse;
    forward.reset(static_cast<LoadType>(type));
    reverse.reset(static_cast<LoadType>(type));
    const double weights[] = {20, 10, 0, -1, 90};
    const double reps[] = {5, 12, 7, 9, 3};
    for (int i = 0; i < 5; ++i) {
      forward.add_set(weights[i], reps[i], true);
      reverse.add_set(weights[4 - i], reps[4 - i], true);
    }
    for (int id = 0; id < 4; ++id) {
      const auto metric = static_cast<Metric>(id);
      CHECK(forward.has_metric(metric) == reverse.has_metric(metric));
      near(forward.metric(metric), reverse.metric(metric));
    }
    near(forward.volume(), reverse.volume());
    near(forward.total_reps(), reverse.total_reps());
  }

  ++cases;  // Typed API and C ABI both reject out-of-range enum values.
  a.reset(static_cast<LoadType>(-1));
  a.add_set(100, 10, true);
  no_metrics(a);
  CHECK(a.recorded_count() == 0);
  for (int id : {-1, 4, std::numeric_limits<int>::min(),
                 std::numeric_limits<int>::max()}) {
    absent(other, static_cast<Metric>(id));
    CHECK(gym_has_metric(id) == 0);
    CHECK(gym_metric(id) == 0);
    gym_reset(id);
    gym_add_set(100, 10, 1);
    CHECK(gym_recorded_count() == 0);
    CHECK(gym_volume() == 0);
    CHECK(gym_total_reps() == 0);
  }

  ++cases;  // ABI v1 uses scalar values, separate presence, and reset/add/query.
  CHECK(gym_abi_version() == 1);
  gym_reset(0);
  gym_add_set(100, 6, 1);
  gym_add_set(40, 8, 0);
  CHECK(gym_has_metric(0) == 1);
  near(gym_metric(0), 100);
  near(gym_metric(1), 8);
  near(gym_metric(2), 120);
  near(gym_metric(3), 600);
  near(gym_volume(), 600);
  near(gym_total_reps(), 14);
  CHECK(gym_recorded_count() == 2);

  ++cases;  // Any nonzero has_weight is true, rather than a narrow 0/1 enum.
  gym_reset(3);
  gym_add_set(5, 8, -7);
  CHECK(gym_has_metric(0) == 1);
  near(gym_metric(0), 5);
  gym_reset(2);
  gym_add_set(0, 3, 0);
  CHECK(gym_has_metric(0) == 1);
  CHECK(gym_metric(0) == 0);

  ++cases;  // Repeated ABI resets clear metrics and recover from invalid states.
  for (int type = 0; type < 4; ++type) {
    gym_reset(type);
    for (int id = 0; id < 4; ++id) CHECK(gym_has_metric(id) == 0);
    gym_add_set(10, 4, 1);
    CHECK(gym_has_metric(1) == 1);
    CHECK(gym_recorded_count() == 1);
  }
}
}  // namespace

int main() {
  run_tests();
  std::cout << "PASS " << cases << " cases / " << checks << " checks\n";
}
