#include <gym/analytics_core.hpp>

namespace gym {

void Accumulator::reset(LoadType load_type) noexcept {
  load_type_ = load_type;
  has_positive_weight_ = false;
  has_assistance_ = false;
  has_estimate_ = false;
  max_weight_ = 0;
  max_reps_ = 0;
  min_assistance_ = 0;
  estimated_1rm_ = 0;
  volume_ = 0;
  total_reps_ = 0;
  recorded_count_ = 0;
}

void Accumulator::add_set(double weight_kg, double reps, bool has_weight) noexcept {
  if (!is_valid_load_type(static_cast<int>(load_type_)) ||
      !__builtin_isfinite(reps) || reps <= 0) {
    return;
  }

  ++recorded_count_;
  total_reps_ += reps;
  if (reps > max_reps_) {
    max_reps_ = reps;
  }

  if (!has_weight || !__builtin_isfinite(weight_kg)) {
    return;
  }

  if (weight_kg >= 0) {
    // When the weights are both zero, keep -0 like JavaScript's Math.min.
    const bool prefer_negative_zero =
        weight_kg == 0 && min_assistance_ == 0 && __builtin_signbit(weight_kg);
    if (!has_assistance_ || weight_kg < min_assistance_ || prefer_negative_zero) {
      min_assistance_ = weight_kg;
    }
    has_assistance_ = true;
  }

  if (weight_kg <= 0) {
    return;
  }
  has_positive_weight_ = true;
  if (weight_kg > max_weight_) {
    max_weight_ = weight_kg;
  }
  volume_ += weight_kg * reps;

  // The Epley estimate uses whole numbers from 1 to 12. Check the range before casting.
  if (reps < 1 || reps > 12 || reps != static_cast<int>(reps)) {
    return;
  }
  const double estimate = weight_kg * (1 + reps / 30);
  if (!has_estimate_ || estimate > estimated_1rm_) {
    estimated_1rm_ = estimate;
  }
  has_estimate_ = true;
}

bool Accumulator::has_metric(Metric metric_id) const noexcept {
  if (!is_valid_load_type(static_cast<int>(load_type_)) ||
      !is_valid_metric(static_cast<int>(metric_id)) || recorded_count_ == 0) {
    return false;
  }
  if (metric_id == Metric::MaxReps) return true;

  switch (load_type_) {
    case LoadType::Weighted:
      if (metric_id == Metric::Estimated1RM) {
        return has_estimate_;
      }
      return has_positive_weight_;
    case LoadType::Bodyweight:
      return false;
    case LoadType::BodyweightAdded:
      return metric_id == Metric::MaxWeight;
    case LoadType::Assisted:
      return metric_id == Metric::MaxWeight && has_assistance_;
  }
  return false;
}

double Accumulator::metric(Metric metric_id) const noexcept {
  if (!has_metric(metric_id)) return 0;
  switch (metric_id) {
    case Metric::MaxWeight:
      // Less help means a greater load for an assisted exercise.
      if (load_type_ == LoadType::Assisted) {
        return min_assistance_;
      }
      return max_weight_;
    case Metric::MaxReps:
      return max_reps_;
    case Metric::Estimated1RM:
      return estimated_1rm_;
    case Metric::Volume:
      return volume_;
  }
  return 0;
}

}  // namespace gym

namespace {
gym::Accumulator abi_accumulator;
}

extern "C" {

int gym_abi_version() noexcept { return 1; }

void gym_reset(int load_type) noexcept {
  if (!gym::is_valid_load_type(load_type)) {
    // Clear the state and ignore sets until a valid load type is selected.
    abi_accumulator.reset(static_cast<gym::LoadType>(-1));
    return;
  }
  abi_accumulator.reset(static_cast<gym::LoadType>(load_type));
}

void gym_add_set(double weight_kg, double reps, int has_weight) noexcept {
  abi_accumulator.add_set(weight_kg, reps, has_weight != 0);
}

int gym_has_metric(int metric) noexcept {
  if (!gym::is_valid_metric(metric)) {
    return 0;
  }
  return abi_accumulator.has_metric(static_cast<gym::Metric>(metric));
}

double gym_metric(int metric) noexcept {
  if (!gym::is_valid_metric(metric)) {
    return 0;
  }
  return abi_accumulator.metric(static_cast<gym::Metric>(metric));
}

double gym_volume() noexcept { return abi_accumulator.volume(); }
double gym_total_reps() noexcept { return abi_accumulator.total_reps(); }
double gym_recorded_count() noexcept { return abi_accumulator.recorded_count(); }

}  // extern "C"
